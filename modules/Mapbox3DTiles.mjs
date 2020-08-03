import * as THREE from '../node_modules/three/build/three.module.js';
import {MERCATOR_A, WORLD_SIZE, ThreeboxConstants} from "./Constants.mjs"
import CameraSync from "./CameraSync.mjs";
import TileSet from "./TileSet.mjs"
import { EffectComposer } from '../node_modules/three/examples/jsm/postprocessing/EffectComposer.js';
import { SSAOPass } from '../node_modules/three/examples/jsm/postprocessing/SSAOPass.js';


export function projectedUnitsPerMeter(latitude) {
  let c = ThreeboxConstants;
  return Math.abs( c.WORLD_SIZE / Math.cos( c.DEG2RAD * latitude ) / c.EARTH_CIRCUMFERENCE );
}

export function projectToWorld(coords) {
  // Spherical mercator forward projection, re-scaling to WORLD_SIZE
  let c = ThreeboxConstants;
  var projected = [
      c.MERCATOR_A * c.DEG2RAD * coords[0] * c.PROJECTION_WORLD_SIZE,
      c.MERCATOR_A * Math.log(Math.tan((Math.PI*0.25) + (0.5 * c.DEG2RAD * coords[1]) )) * c.PROJECTION_WORLD_SIZE
  ];

  //z dimension, defaulting to 0 if not provided
  if (!coords[2]) {
    projected.push(0)
  } else {
      var pixelsPerMeter = projectedUnitsPerMeter(coords[1]);
      projected.push( coords[2] * pixelsPerMeter );
  }

  var result = new THREE.Vector3(projected[0], projected[1], projected[2]);

  return result;
}

export default class Layer {
	constructor (params) {
	  if (!params) throw new Error('parameters missing for mapbox 3D tiles layer');
	  if (!params.id) throw new Error('id parameter missing for mapbox 3D tiles layer');
	  //if (!params.url) throw new Error('url parameter missing for mapbox 3D tiles layer');
	  
	  this.id = params.id,
	  this.url = params.url;
	  this.styleParams = {};
	  if ('color' in params) this.styleParams.color = params.color;
	  if ('opacity' in params) this.styleParams.opacity = params.opacity;
	  if ('pointsize' in params) this.styleParams.pointsize = params.pointsize;
  
	  this.loadStatus = 0;
	  this.viewProjectionMatrix = null;
	  
	  this.type = 'custom';
	  this.renderingMode = '3d';
	}
	LightsArray() {
	  const arr = [];
	  let directionalLight1 = new THREE.DirectionalLight(0xffffff,0.5);
	  directionalLight1.position.set(0.5, 1, 0.5).normalize();
	  let target = directionalLight1.target.position.set(100000000, 1000000000, 0).normalize();
	  arr.push(directionalLight1);
  
	  let directionalLight2 = new THREE.DirectionalLight(0xffffff,0.5);
	  //directionalLight2.position.set(0, 70, 100).normalize();
	  directionalLight2.position.set(0.3, 0.3, 1).normalize();
	  arr.push(directionalLight2);
  
	  //arr.push(new THREE.DirectionalLightHelper( directionalLight1, 500));
	  //arr.push(new THREE.DirectionalLightHelper( directionalLight2, 500));     
  
			//this.scene.background = new THREE.Color( 0xaaaaaa );
			//this.scene.add( new THREE.DirectionalLight() );
			//this.scene.add( new THREE.HemisphereLight() );
	  return arr;
	}
	loadVisibleTiles() {
	  if (this.tileset && this.tileset.root) {
		//console.log(`map width: ${this.map.transform.width}, height: ${this.map.transform.height}`);
		//console.log(`Basegeometric error: ${40000000/(512*Math.pow(2,this.map.getZoom()))}`)
		this.tileset.root.checkLoad(this.cameraSync.frustum, this.cameraSync.cameraPosition);
	  }
	}
	onAdd(map, gl) {
	  this.map = map;
	  const fov = 36.8;
	  const aspect = map.getCanvas().width/map.getCanvas().height;
	  const near = 0.000000000001;
	  const far = Infinity;
	  // create perspective camera, parameters reinitialized by CameraSync
	  this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  
	  this.mapQueryRenderedFeatures = map.queryRenderedFeatures.bind(this.map);
	  this.map.queryRenderedFeatures = this.queryRenderedFeatures.bind(this);
			
	  this.scene = new THREE.Scene();
	  this.rootTransform = [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
	  let lightsarray = this.LightsArray();
	  lightsarray.forEach(light=>{
		this.scene.add(light);
	  });
	  this.world = new THREE.Group();
	  this.world.name = 'flatMercatorWorld';
	  this.scene.add(this.world);
  
	  this.renderer = new THREE.WebGLRenderer({
		alpha: true, 
		antialias: true, 
		canvas: map.getCanvas(),
		context: gl,
	  });
	  
	  /* WIP on composer */
	  let width = window.innerWidth;
	  let height = window.innerHeight;
	  this.composer = new EffectComposer( this.renderer );

	  let ssaoPass = new SSAOPass( this.scene, this.camera, width, height );
	  ssaoPass.kernelRadius = 0.1;
	  //this.composer.addPass( ssaoPass );
	  /* END OF WIP */

	  this.renderer.shadowMap.enabled = true;
	  this.renderer.autoClear = false;
  
	  this.cameraSync = new CameraSync(this.map, this.camera, this.world);
	  this.cameraSync.updateCallback = ()=>this.loadVisibleTiles();
	  
	  //raycaster for mouse events
	  this.raycaster = new THREE.Raycaster();
	  if (this.url) {
		this.tileset = new TileSet(()=>this.map.triggerRepaint());
		this.tileset.load(this.url, this.styleParams).then(()=>{
		if (this.tileset.root) {
		  this.world.add(this.tileset.root.totalContent);
		  this.world.updateMatrixWorld();
		  this.loadStatus = 1;
		  this.loadVisibleTiles();
		}
	  }).catch(error=>{
		console.error(`${error} (${this.url})`);
	  })
	  }
	}
	onRemove(map, gl) {
	  // todo: (much) more cleanup?
	  this.map.queryRenderedFeatures = this.mapQueryRenderedFeatures;
	  this.cameraSync = null;
	}
	queryRenderedFeatures(geometry, options){
	  let result = this.mapQueryRenderedFeatures(geometry, options);
	  if (!this.map || !this.map.transform) {
		return result;
	  }
	  if (!(options && options.layers && !options.layers.includes(this.id))) {
		if (geometry && geometry.x && geometry.y) {     
		  var mouse = new THREE.Vector2();
		  
		  // // scale mouse pixel position to a percentage of the screen's width and height
		  mouse.x = ( geometry.x / this.map.transform.width ) * 2 - 1;
		  mouse.y = 1 - ( geometry.y / this.map.transform.height ) * 2;
  
		  this.raycaster.setFromCamera(mouse, this.camera);
  
		  // calculate objects intersecting the picking ray
		  let intersects = this.raycaster.intersectObjects(this.world.children, true);
		  if (intersects.length) {
			let feature = {
			  "type": "Feature",
			  "properties" : {},
			  "geometry" :{},
			  "layer": {"id": this.id, "type": "custom 3d"},
			  "source": this.url,
			  "source-layer": null,
			  "state": {}
			}
			let propertyIndex;
			let intersect = intersects[0];
			if (intersect.object && intersect.object.geometry && 
				intersect.object.geometry.attributes && 
				intersect.object.geometry.attributes._batchid) {
			  let geometry = intersect.object.geometry;
			  let vertexIdx = intersect.faceIndex;
			  if (geometry.index) {
				// indexed BufferGeometry
				vertexIdx = geometry.index.array[intersect.faceIndex*3];
				propertyIndex = geometry.attributes._batchid.data.array[vertexIdx*7+6]
			  } else {
				// un-indexed BufferGeometry
				propertyIndex = geometry.attributes._batchid.array[vertexIdx*3];
			  }            
			  let keys = Object.keys(intersect.object.userData);
			  if (keys.length) {
				for (let propertyName of keys) {
				  feature.properties[propertyName] = intersect.object.userData[propertyName][propertyIndex];
				}
			  } else {
				feature.properties.batchId = propertyIndex;
			  }
			} else {
			  if (intersect.index != null) {
				feature.properties.index = intersect.index;
			  } else {
				feature.properties.name = this.id;
			  }
			}
			/* WORK in progress 
			if (options.outline != false && (intersect.object !== this.outlinedObject || 
				(propertyIndex != null && propertyIndex !== this.outlinePropertyIndex) 
				  || (propertyIndex == null && intersect.index !== this.outlineIndex))) {
			  
			  //WIP
			  
			  //this.outlinePass.selectedObjects = [intersect.object];
  
			  // update outline
			  if (this.outlineMesh) {
				let parent = this.outlineMesh.parent;
				parent.remove(this.outlineMesh);
				this.outlineMesh = null;
			  }
			  this.outlinePropertyIndex = propertyIndex;
			  this.outlineIndex = intersect.index;
			  if (intersect.object instanceof THREE.Mesh) {
				this.outlinedObject = intersect.object;
				let outlineMaterial = new THREE.MeshBasicMaterial({color: options.outlineColor? options.outlineColor : 0xff0000, wireframe: true});
				let outlineMesh;
				if (intersect.object && 
					intersect.object.geometry && 
					intersect.object.geometry.attributes && 
					intersect.object.geometry.attributes._batchid) {
				  // create new geometry from faces that have same _batchid
				  let geometry = intersect.object.geometry;
				  if (geometry.index) {
					let ip1 = geometry.index.array[intersect.faceIndex*3];
					let idx = geometry.attributes._batchid.data.array[ip1*7+6];
					let blockFaces = [];
					for (let faceIndex = 0; faceIndex < geometry.index.array.length; faceIndex += 3) {
					  let p1 = geometry.index.array[faceIndex];
					  if (geometry.attributes._batchid.data.array[p1*7+6] === idx) {
						let p2 = geometry.index.array[faceIndex+1];
						if (geometry.attributes._batchid.data.array[p2*7+6] === idx) {
						  let p3 = geometry.index.array[faceIndex+2];
						  if (geometry.attributes._batchid.data.array[p3*7+6] === idx) {
							blockFaces.push(faceIndex);
						  }
						}
					  }
					}  
					let highLightGeometry = new THREE.Geometry(); 
					for (let vertexCount = 0, face = 0; face < blockFaces.length; face++) {
					  let faceIndex = blockFaces[face];
					  let p1 = geometry.index.array[faceIndex];
					  let p2 = geometry.index.array[faceIndex+1];
					  let p3 = geometry.index.array[faceIndex+2];
					  let positions = geometry.attributes.position.data.array;
					  highLightGeometry.vertices.push(
						new THREE.Vector3(positions[p1*7], positions[p1*7+1], positions[p1*7+2]),
						new THREE.Vector3(positions[p2*7], positions[p2*7+1], positions[p2*7+2]),
						new THREE.Vector3(positions[p3*7], positions[p3*7+1], positions[p3*7+2]),
					  )
					  highLightGeometry.faces.push(new THREE.Face3(vertexCount, vertexCount+1, vertexCount+2));
					  vertexCount += 3;
					}
					highLightGeometry.computeBoundingSphere();
					outlineMesh = new THREE.Mesh(highLightGeometry, outlineMaterial);
				  } else {
					let ip1 = intersect.faceIndex*3;
					let idx = geometry.attributes._batchid.array[ip1];
					let blockFaces = [];
					for (let faceIndex = 0; faceIndex < geometry.attributes._batchid.array.length; faceIndex += 3) {
					  let p1 = faceIndex;
					  if (geometry.attributes._batchid.array[p1] === idx) {
						let p2 = faceIndex + 1;
						if (geometry.attributes._batchid.array[p2] === idx) {
						  let p3 = faceIndex + 2;
						  if (geometry.attributes._batchid.array[p3] === idx) {
							blockFaces.push(faceIndex);
						  }
						}
					  }
					}
					let highLightGeometry = new THREE.Geometry(); 
					for (let vertexCount = 0, face = 0; face < blockFaces.length; face++) {
					  let faceIndex = blockFaces[face] * 3;
					  let positions = geometry.attributes.position.array;
					  highLightGeometry.vertices.push(
						new THREE.Vector3(positions[faceIndex], positions[faceIndex+1], positions[faceIndex+2]),
						new THREE.Vector3(positions[faceIndex+3], positions[faceIndex+4], positions[faceIndex+5]),
						new THREE.Vector3(positions[faceIndex+6], positions[faceIndex+7], positions[faceIndex+8]),
					  )
					  highLightGeometry.faces.push(new THREE.Face3(vertexCount, vertexCount+1, vertexCount+2));
					  vertexCount += 3;
					}
					highLightGeometry.computeBoundingSphere();   
					outlineMesh = new THREE.Mesh(highLightGeometry, outlineMaterial);
				  }
				} else {
				  outlineMesh = new THREE.Mesh(this.outlinedObject.geometry, outlineMaterial);
				}
				outlineMesh.position.x = this.outlinedObject.position.x+0.1;
				outlineMesh.position.y = this.outlinedObject.position.y+0.1;
				outlineMesh.position.z = this.outlinedObject.position.z+0.1;
				outlineMesh.quaternion.copy(this.outlinedObject.quaternion);
				outlineMesh.scale.copy(this.outlinedObject.scale);
				outlineMesh.matrix.copy(this.outlinedObject.matrix);
				outlineMesh.raycast = () =>{};
				outlineMesh.name = "outline";
				outlineMesh.wireframe = true;
				this.outlinedObject.parent.add(outlineMesh);
				this.outlineMesh = outlineMesh;
				
			  }
			}
			/* END OF work in progress */
			result.unshift(feature);
			this.map.triggerRepaint();
		  } else {
			this.outlinedObject = null;
			if (this.outlineMesh) {
			  let parent = this.outlineMesh.parent;
			  parent.remove(this.outlineMesh);
			  this.outlineMesh = null;
			  this.map.triggerRepaint();
			}
		  }
		}
	  }
	  return result;
	}
	_update() {
	  this.renderer.state.reset();
	  this.renderer.render (this.scene, this.camera);
	  //WIP on composer
	  //this.composer.render (this.scene, this.camera);

	  /*if (this.loadStatus == 1) { // first render after root tile is loaded
		this.loadStatus = 2;
		let frustum = new THREE.Frustum();
		frustum.setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse));
		if (this.tileset.root) {
		  this.tileset.root.checkLoad(frustum, this.getCameraPosition());
		}
	  }*/
	}
	update() {
	  requestAnimationFrame(()=>this._update());
	}
	render(gl, viewProjectionMatrix) {
	  this._update();
	}
  }