import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {DEBUG} from "./Constants.mjs"
import {PNTS, B3DM} from "./TileLoaders.mjs"
import {IMesh} from "./InstancedMesh.mjs"
import {LatToScale, YToLat} from "./Utils.mjs"

export default class ThreeDeeTile {
	constructor(json, resourcePath, styleParams, updateCallback, parentRefine, parentTransform,projectToMercator) {
	  this.loaded = false;
	  this.styleParams = styleParams;
	  this.updateCallback = updateCallback;
	  this.resourcePath = resourcePath;
	  this.projectToMercator = projectToMercator;
	  this.totalContent = new THREE.Group();  // Three JS Object3D Group for this tile and all its children
	  this.tileContent = new THREE.Group();    // Three JS Object3D Group for this tile's content
	  this.childContent = new THREE.Group();    // Three JS Object3D Group for this tile's children
	  this.totalContent.add(this.tileContent);
	  this.totalContent.add(this.childContent);
	  this.boundingVolume = json.boundingVolume;
	  if (this.boundingVolume && this.boundingVolume.box) {
		let b = this.boundingVolume.box;
		let extent = [b[0] - b[3], b[1] - b[7], b[0] + b[3], b[1] + b[7]];
		let sw = new THREE.Vector3(extent[0], extent[1], b[2] - b[11]);
		let ne = new THREE.Vector3(extent[2], extent[3], b[2] + b[11]);
		this.box = new THREE.Box3(sw, ne);
		if (DEBUG) {
		  let geom = new THREE.BoxGeometry(b[3] * 2, b[7] * 2, b[11] * 2);
		  let edges = new THREE.EdgesGeometry( geom );
		  this.debugColor = new THREE.Color( 0xffffff );
		  this.debugColor.setHex( Math.random() * 0xffffff );
		  let line = new THREE.LineSegments( edges, new THREE.LineBasicMaterial( {color:this.debugColor }) );
		  let trans = new THREE.Matrix4().makeTranslation(b[0], b[1], b[2]);
		  line.applyMatrix4(trans);
		  this.debugLine = line;
		} else {
			//ToDo: I3BM doesn't seem to work without the debugLine, add a transparant one for now
			let line = new THREE.LineSegments(  new THREE.EdgesGeometry(new THREE.BoxGeometry(b[3] * 2, b[7] * 2, b[11] * 2)), new THREE.LineBasicMaterial( {color: new THREE.Color(0xff0000), transparent: true, linewidth: 0.0, visible: false, opacity: 0.0}) );
			this.debugLine = line;
		}
	  } else {
		this.extent = null;
		this.sw = null;
		this.ne = null;
		this.box = null;
		this.center = null;
	  }
	  this.refine = json.refine ? json.refine.toUpperCase() : parentRefine;
	  this.geometricError = json.geometricError;
	  this.worldTransform = parentTransform ? parentTransform.clone() : new THREE.Matrix4();
	  this.transform = json.transform;
	  if (this.transform) 
	  { 
		let tileMatrix = new THREE.Matrix4().fromArray(this.transform);
		this.totalContent.applyMatrix4(tileMatrix);
		this.worldTransform.multiply(tileMatrix);
	  }
	  this.content = json.content;
	  this.children = [];
	  if (json.children) {
		for (let i=0; i<json.children.length; i++){
		  let child = new ThreeDeeTile(json.children[i], resourcePath, styleParams, updateCallback, this.refine, this.worldTransform, this.projectToMercator);
		  this.childContent.add(child.totalContent);
		  this.children.push(child);
		}
	  }
	}
	//ThreeDeeTile.load
	async load() {
	  if (this.unloadedTileContent) {
		this.totalContent.add(this.tileContent);
		this.unloadedTileContent = false;
	  }
	  if (this.unloadedChildContent) {
		this.totalContent.add(this.childContent);
		this.unloadedChildContent = false;
	  }
	  if (this.unloadedDebugContent) {
		this.totalContent.add(this.debugLine);
		this.unloadedDebugContent = false;
	  }
	  if (this.loaded) {
		this.updateCallback();
		return;
	  }
	  this.loaded = true;

	  if (this.debugLine) {        
		this.totalContent.add(this.debugLine);
	  }
	  if (this.content) {
		let url = this.content.uri ? this.content.uri : this.content.url;
		if (!url) return;
		if (url.substr(0, 4) != 'http')
		  url = this.resourcePath + url;
		let type = url.slice(-4);
		switch (type) {
		  case 'json':
			// child is a tileset json
			try {
			  let subTileset = new TileSet(()=>this.updateCallback());
			  await subTileset.load(url, this.styleParams);
			  if (subTileset.root) {
				this.box.applyMatrix4(this.worldTransform);
				let inverseMatrix = new THREE.Matrix4().getInverse(this.worldTransform);
				this.totalContent.applyMatrix4(inverseMatrix);
				this.totalContent.updateMatrixWorld();
				this.worldTransform = new THREE.Matrix4();
  
				this.children.push(subTileset.root);
				this.childContent.add(subTileset.root.totalContent);
				subTileset.root.totalContent.updateMatrixWorld();
				subTileset.root.checkLoad(this.frustum, this.cameraPosition);
			  }
			} catch (error) {
			  // load failed (wrong url? connection issues?)
			  // log error, do not break program flow
			  console.error(error);
			}
			break;
		  case 'b3dm':
			try {
			  let loader = new GLTFLoader();
			  let b3dm = new B3DM(url);
			  let rotateX = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(1, 0, 0), Math.PI / 2);
			  this.tileContent.applyMatrix4(rotateX); // convert from GLTF Y-up to Z-up
			  let b3dmData = await b3dm.load();
			  loader.parse(b3dmData.glbData, this.resourcePath, (gltf) => {
				  if (this.projectToMercator) {
					//TODO: must be a nicer way to get the local Y in webmerc. than worldTransform.elements	
					gltf.scene.scale.setScalar(LatToScale(YToLat(this.worldTransform.elements[13])));
				  }
				  gltf.scene.traverse(child => {
					if (child instanceof THREE.Mesh) {
					  // some gltf has wrong bounding data, recompute here
					  child.geometry.computeBoundingBox();
					  child.geometry.computeBoundingSphere();
					
					  child.material.depthWrite = true; // necessary for Velsen dataset?
					  //Add the batchtable to the userData since gltLoader doesn't deal with it
					  child.userData = b3dmData.batchTableJson;
					  child.userData.b3dm = url.replace(this.resourcePath, '').replace('.b3dm', '');
					}
				  });
				  if (this.styleParams.color != null || this.styleParams.opacity != null) {
					let color = new THREE.Color(this.styleParams.color);
					gltf.scene.traverse(child => {
					  if (child instanceof THREE.Mesh) {
						if (this.styleParams.color != null) 
						  child.material.color = color;
						if (this.styleParams.opacity != null) {
						  child.material.opacity = this.styleParams.opacity;
						  child.material.transparent = this.styleParams.opacity < 1.0 ? true : false;
						}
					  }
					});
				  }
				  if (this.debugColor) {
					gltf.scene.traverse(child => {
					  if (child instanceof THREE.Mesh) {
						child.material.color = this.debugColor;
					  }
					})
				  }
				  this.tileContent.add(gltf.scene);
				}, (error) => {
				  throw new Error('error parsing gltf: ' + error);
				}
			  );
			} catch (error) {
			  console.error(error);
			}
			break;
		  case 'i3dm':
			try {
				let loader = new GLTFLoader();
				let i3dm = new B3DM(url);
				
				let i3dmData = await i3dm.load();
				// Check what metadata is present in the featuretable, currently using: https://github.com/CesiumGS/3d-tiles/tree/master/specification/TileFormats/Instanced3DModel#instance-orientation.
				let positions = new Float32Array(i3dmData.featureTableBinary, i3dmData.featureTableJSON.POSITION.byteOffset, i3dmData.featureTableJSON.INSTANCES_LENGTH * 3);  
				let normalsRight = new Float32Array(i3dmData.featureTableBinary, i3dmData.featureTableJSON.NORMAL_RIGHT.byteOffset, i3dmData.featureTableJSON.INSTANCES_LENGTH * 3);
				let normalsUp = new Float32Array(i3dmData.featureTableBinary, i3dmData.featureTableJSON.NORMAL_UP.byteOffset, i3dmData.featureTableJSON.INSTANCES_LENGTH * 3);
				let inverseMatrix = new THREE.Matrix4().getInverse(this.worldTransform); // in order to offset by the tile
				let self = this;
				loader.parse(i3dmData.glbData, this.resourcePath, (gltf) => {
					let origin = null;

					gltf.scene.traverse(child => {
						if (child instanceof THREE.Mesh) {
							child.userData = i3dmData.batchTableJson;
							if (!origin) {
								origin = child.position;
							} else {
								if (child.position.y < origin.y) {
									// set object origin to vertically lowest mesh
									origin = child.position;
								}
							}
							
							let position = child.position.clone();
							IMesh(child, positions, normalsRight, normalsUp, inverseMatrix, position.sub(origin))
								.then(d=>self.tileContent.add(d));
					}
				});
				});
			} catch (error) {
				console.error(error.message);
			}
			break;
		  case 'pnts':
			try {
			  let pnts = new PNTS(url);
			  let pointData = await pnts.load();            
			  let geometry = new THREE.BufferGeometry();
			  geometry.setAttribute('position', new THREE.Float32BufferAttribute(pointData.points, 3));
			  let material = new THREE.PointsMaterial();
			  material.size = this.styleParams.pointsize != null ? this.styleParams.pointsize : 1.0;
			  if (this.styleParams.color) {
				material.vertexColors = THREE.NoColors;
				material.color = new THREE.Color(this.styleParams.color);
				material.opacity = this.styleParams.opacity != null ? this.styleParams.opacity : 1.0;
			  } else if (pointData.rgba) {
				geometry.setAttribute('color', new THREE.Float32BufferAttribute(pointData.rgba, 4));
				material.vertexColors = THREE.VertexColors;
			  } else if (pointData.rgb) {
				geometry.setAttribute('color', new THREE.Float32BufferAttribute(pointData.rgb, 3));
				material.vertexColors = THREE.VertexColors;
			  }
			  this.tileContent.add(new THREE.Points( geometry, material ));
			  if (pointData.rtc_center) {
				let c = pointData.rtc_center;
				this.tileContent.applyMatrix4(new THREE.Matrix4().makeTranslation(c[0], c[1], c[2]));
			  }
			  this.tileContent.add(new THREE.Points( geometry, material ));
			} catch (error) {
			  console.error(error);
			}
			break;
		  case 'cmpt':
			throw new Error('cmpt tiles not yet implemented');
			break;
		  default:
			throw new Error('invalid tile type: ' + type);
		}
	  }
	  this.updateCallback();
	}
	unload(includeChildren) {
	  this.unloadedTileContent = true;
	  this.totalContent.remove(this.tileContent);
  
	  //this.tileContent.visible = false;
	  if (includeChildren) {
		this.unloadedChildContent = true;
		this.totalContent.remove(this.childContent);
		//this.childContent.visible = false;
	  } else  {
		if (this.unloadedChildContent) {
		  this.unloadedChildContent = false;
		  this.totalContent.add(this.childContent);
		}
	  }
	  if (this.debugLine) {
		this.totalContent.remove(this.debugLine);
		this.unloadedDebugContent = true;
	  }
	  this.updateCallback();
	  // TODO: should we also free up memory?
	}
	checkLoad(frustum, cameraPosition) {
  
	  this.frustum = frustum;
	  this.cameraPosition = cameraPosition;
	  /*this.load();
	  for (let i=0; i<this.children.length;i++) {
		this.children[i].checkLoad(frustum, cameraPosition);
	  }
	  return;
	  */
  
	  /*if (this.totalContent.parent.name === "world") {
		this.totalContent.parent.updateMatrixWorld();
	  }*/
	  let transformedBox = this.box.clone();
	  transformedBox.applyMatrix4(this.totalContent.matrixWorld);
	  
	  // is this tile visible?
	  if (!frustum.intersectsBox(transformedBox)) {
		this.unload(true);
		return;
	  }
	  
	  let worldBox = this.box.clone().applyMatrix4(this.worldTransform);
	  let dist = worldBox.distanceToPoint(cameraPosition);
	  
  
	  //console.log(`dist: ${dist}, geometricError: ${this.geometricError}`);
	  // are we too far to render this tile?
	  if (this.geometricError > 0.0 && dist > this.geometricError * 50.0) {
		this.unload(true);
		return;
	  }
	  //console.log(`camPos: ${cameraPosition.z}, dist: ${dist}, geometricError: ${this.geometricError}`);
	  
	  // should we load this tile?
	  if (this.refine == 'REPLACE' && dist < this.geometricError * 20.0) {
		this.unload(false);
	  } else {
		this.load();
	  }
	  
	  
	  // should we load its children?
	  for (let i=0; i<this.children.length; i++) {
		if (dist < this.geometricError * 20.0) {
		  this.children[i].checkLoad(frustum, cameraPosition);
		} else {
		  this.children[i].unload(true);
		}
	  }
  
	  /*
	  // below code loads tiles based on screenspace instead of geometricError,
	  // not sure yet which algorith is better so i'm leaving this code here for now
	  let sw = this.box.min.clone().project(camera);
	  let ne = this.box.max.clone().project(camera);      
	  let x1 = sw.x, x2 = ne.x;
	  let y1 = sw.y, y2 = ne.y;
	  let tilespace = Math.sqrt((x2 - x1)*(x2 - x1) + (y2 - y1)*(y2 - y1)); // distance in screen space
	  
	  if (tilespace < 0.2) {
		this.unload();
	  }
	  // do nothing between 0.2 and 0.25 to avoid excessive tile loading/unloading
	  else if (tilespace > 0.25) {
		this.load();
		this.children.forEach(child => {
		  child.checkLoad(camera);
		});
	  }*/
	  
	}
  }
