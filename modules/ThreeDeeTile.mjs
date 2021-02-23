import * as THREE from 'three';

import {DEBUG} from "./Constants.mjs"
import {PNTS, B3DM,CMPT} from "./TileLoaders.mjs"
import {IMesh} from "./InstancedMesh.mjs"
import {LatToScale, YToLat} from "./Utils.mjs"
import TileSet from './TileSet.mjs';
import applyStyle from './Styler.mjs'

export default class ThreeDeeTile {
	constructor(json, resourcePath, styleParams, updateCallback, renderCallback, parentRefine, parentTransform, projectToMercator, loader, dracoEnabled) {
	  this.loaded = false;
	  this.styleParams = styleParams;
	  this.updateCallback = updateCallback;
	  this.renderCallback = renderCallback;
	  this.resourcePath = resourcePath;
	  this.projectToMercator = projectToMercator;
	  this.loader=loader;
	  this.dracoEnabled = dracoEnabled;
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
		  let child = new ThreeDeeTile(json.children[i], resourcePath, this.styleParams, updateCallback, renderCallback, this.refine, this.worldTransform, this.projectToMercator, this.loader);
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
		this.updateCallback(this);
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
			  let subTileset = new TileSet((ts)=>this.updateCallback(ts), ()=>this.renderCallback(), this.dracoEnabled);
			  await subTileset.load(url, this.styleParams);
			  if (subTileset.root) {
				this.box.applyMatrix4(this.worldTransform);

				// Threejs > 119
				//let inverseMatrix = new THREE.Matrix4();
				//inverseMatrix.copy(this.worldTransform).invert();
			
				// Threejs < 120
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
			  this.tileLoader = new B3DM(url);
			  let b3dmData = await this.tileLoader.load();
			  this.tileLoader = null;
			  this.b3dmAdd(b3dmData, url);
			} catch (error) {
			  if (error.name === "AbortError") {
				  this.loaded = false;
				  return;
			  }
			  console.error(error);
			}
			break;
		  case 'i3dm':
			try {
				this.tileLoader = new B3DM(url);
				let i3dmData = await this.tileLoader.load();
				this.tileLoader = null;
				this.i3dmAdd(i3dmData);
			} catch (error) {
				if (error.name === "AbortError") {
					this.loaded = false;
					return;
				}
				console.error(error.message);
			}
			break;
		  case 'pnts':
			try {
			  this.tileLoader = new PNTS(url);
			  let pointData = await this.tileLoader.load();
			  this.tileLoader = null;
			  this.pntsAdd(pointData);
			} catch (error) {
			  if (error.name === "AbortError") {
				this.loaded = false;
				return;
			  }
			  console.error(error);
			}
			break;
		  case 'cmpt':
			try {
				this.tileLoader = new CMPT(url);
				let compositeTiles = await this.tileLoader.load();
				this.tileLoader = null;
				this.cmptAdd(compositeTiles, url);
			} catch (error) {
				if (error.name === "AbortError") {
					this.loaded = false;
					return;
				}
				console.error(error);
			}
			break;
		  default:
			throw new Error('invalid tile type: ' + type);
		}
	  }
	  this.updateCallback(this);
	}
	async cmptAdd(compositeTiles, url) {
		if (this.cmptAdded) {
			// prevent duplicate adding
			return;
		}
		this.cmptAdded = true;
		for (let innerTile of compositeTiles) {
			switch(innerTile.type) {
				case 'i3dm':
					let i3dm = new B3DM('.i3dm');
					let i3dmData = await i3dm.parseResponse(innerTile.data);
					this.i3dmAdd(i3dmData);
					break;
				case 'b3dm':
					let b3dm = new B3DM('.b3dm');
					let b3dmData = await b3dm.parseResponse(innerTile.data);
					this.b3dmAdd(b3dmData, url.slice(0,-4) + 'b3dm');
					break;
				case 'pnts':
					let pnts = new PNTS('.pnts');
					let pointData = pnts.parseResponse(innerTile.data);
					this.pntsAdd(pointData);
					break;
				case 'cmpt':
					let cmpt = new CMPT('.cmpt');
					let subCompositeTiles = cmpt.parseResponse(innerTile.data);
					this.cmptAdd(subCompositeTiles);
					break;
				default:
					console.error(`Composite type ${innerTile.type} not supported`);
					break;
			}
			//console.log(`type: ${innerTile.type}, size: ${innerTile.data.byteLength}`);
		}
	}
	pntsAdd(pointData) {
		if (this.pntsAdded && !this.cmptAdded) {
			// prevent duplicate adding
			return;
		}
		this.pntsAdded = true;
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
		this.renderCallback(this);
	}
	b3dmAdd(b3dmData, url) {
        if (this.b3dmAdded && !this.cmptAdded) {
            // prevent duplicate adding
            return;
        }
        this.b3dmAdded = true;
		//'/examples/js/libs/draco'
		
        let rotateX = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(1, 0, 0), Math.PI / 2);
        this.tileContent.applyMatrix4(rotateX); // convert from GLTF Y-up to Z-up
        this.loader.parse(
            b3dmData.glbData,
            this.resourcePath,
            (gltf) => {
                let scene = gltf.scene || gltf.scenes[0];
                //Add the batchtable to the userData since gltfLoader doesn't deal with it
                scene.userData = b3dmData.batchTableJson;
                if (scene.userData && Array.isArray(b3dmData.batchTableJson.attr)) {
                    scene.userData.attr = scene.userData.attr.map((d) => d.split(','));
                    scene.userData.b3dm = url.replace(this.resourcePath, '').replace('.b3dm', '');
                }

                if (this.projectToMercator) {
                    //TODO: must be a nicer way to get the local Y in webmerc. than worldTransform.elements
                    scene.scale.setScalar(LatToScale(YToLat(this.worldTransform.elements[13])));
                }

                scene.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
						child.castShadow = true;
						  child.material = new THREE.MeshStandardMaterial({
                              color: '#555555'
                          });
										
                    }
                });

                scene = applyStyle(scene, this.styleParams);

                this.tileContent.add(scene);
				this.renderCallback(this);
            },
            (error) => {
                throw new Error('error parsing gltf: ' + error);
            }
        );
    }
	i3dmAdd(i3dmData) {
		if (this.i3dmAdded && !this.cmptAdded) {
			// prevent duplicate adding
			return;
		}
		this.i3dmAdded = true;

		// Check what metadata is present in the featuretable, currently using: https://github.com/CesiumGS/3d-tiles/tree/master/specification/TileFormats/Instanced3DModel#instance-orientation.				
		let metadata = i3dmData.featureTableJSON;
		if (!metadata.POSITION) {
			console.error(`i3dm missing position metadata`);
			return;
		}
		let instancesParams = {
			positions : new Float32Array(i3dmData.featureTableBinary, metadata.POSITION.byteOffset, metadata.INSTANCES_LENGTH * 3)
		}
		if (metadata.RTC_CENTER) {
			if (Array.isArray(metadata.RTC_CENTER) && metadata.RTC_CENTER.length === 3) {
				instancesParams.rtcCenter = [metadata.RTC_CENTER[0], metadata.RTC_CENTER[1],metadata.RTC_CENTER[2]];
			} 
		}
		if (metadata.NORMAL_UP && metadata.NORMAL_RIGHT) {
			instancesParams.normalsRight = new Float32Array(i3dmData.featureTableBinary, metadata.NORMAL_RIGHT.byteOffset, metadata.INSTANCES_LENGTH * 3);
			instancesParams.normalsUp = new Float32Array(i3dmData.featureTableBinary, metadata.NORMAL_UP.byteOffset, metadata.INSTANCES_LENGTH * 3);	
		}
		if (metadata.SCALE) {
			instancesParams.scales = new Float32Array(i3dmData.featureTableBinary, metadata.SCALE.byteOffset, metadata.INSTANCES_LENGTH);
		}
		if (metadata.SCALE_NON_UNIFORM) {
			instancesParams.xyzScales = new Float32Array(i3dmData.featureTableBinary, metadata.SCALE_NON_UNIFORM.byteOffset, metadata.INSTANCES_LENGTH);
		}

		// Threejs > 119
		//let inverseMatrix = new THREE.Matrix4();
		//inverseMatrix.copy(this.worldTransform).invert(); // in order to offset by the tile
		
		// Threejs < 120
		let inverseMatrix = new THREE.Matrix4().getInverse(this.worldTransform);

		let self = this;
		this.loader.parse(i3dmData.glbData, this.resourcePath, (gltf) => {
			let scene = gltf.scene || gltf.scenes[0];
			scene.rotateX(Math.PI / 2); // convert from GLTF Y-up to Mapbox Z-up
			scene.updateMatrixWorld(true);
								
			scene.traverse(child => {
				if (child instanceof THREE.Mesh) {
					child.castShadow = true;
					child.userData = i3dmData.batchTableJson;
					IMesh(child, instancesParams, inverseMatrix)
						.then(d=>self.tileContent.add(d));
				}
			});
		});

		this.renderCallback(this);
	}
	
	unload(includeChildren) {
	  if (this.tileLoader) {
			this.tileLoader.abortLoad();
	  }

	  this.unloadedTileContent = true;
	  
	  if (this.loaded) {
		this.totalContent.remove(this.tileContent);
	  	this.freeObjectFromMemory(this.tileContent); 
		this.tileContent = new THREE.Group();
		this.loaded = false;
	  	this.b3dmAdded = false;
		this.i3dmAdded = false;
		this.cmptAdded = false;
	  }
	  
	   
	  //this.tileContent.visible = false;
	  if (includeChildren) {
		this.unloadedChildContent = true;
		this.totalContent.remove(this.childContent);
		this.freeObjectFromMemory(this.tileContent);
		//this.childContent.visible = false;
	  } else  {
		if (this.unloadedChildContent) {
		  this.unloadedChildContent = false;
		  this.totalContent.add(this.childContent);
		}
	  }
	  if (this.debugLine) {
		this.totalContent.remove(this.debugLine);
		this.freeObjectFromMemory(this.debugLine);
		this.unloadedDebugContent = true;
	  }
	  this.updateCallback(this);
	  
	  
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
		// remove from memory
		this.unload(true);
		return;
	  }

	  //console.log(`camPos: ${cameraPosition.z}, dist: ${dist}, geometricError: ${this.geometricError}`);
	  // should we load this tile?
	  if ((this.refine == 'REPLACE' && dist < this.geometricError * 20.0 && this.children.length > 0)) {
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

	freeObjectFromMemory(object) {
		object.traverse(function(obj){
			if (obj.material && obj.material.dispose) {
			  obj.material.dispose();
			  if (obj.material.map) {
				obj.material.map.dispose();
			  }
			}
			if (obj.geometry && obj.geometry.dispose) {
			  obj.geometry.dispose();
			  obj.geometry.attributes.color = {};
			  obj.geometry.attributes.normal = {};
			  obj.geometry.attributes.position = {};
			  obj.geometry.attributes.uv = {};
			  obj.geometry.attributes = {};
			  obj.material = {};
			}
		})
	  }
  }
