import * as THREE from '../node_modules/three/build/three.module.js';
import ThreeDeeTile from "./ThreeDeeTile.mjs"

export default class TileSet {
	constructor(updateCallback){
	  if (!updateCallback) {
		updateCallback = ()=>{};
	  }
	  this.updateCallback = updateCallback;
	  this.url = null;
	  this.version = null;
	  this.gltfUpAxis = 'Z';
	  this.geometricError = null;
	  this.root = null;
	}
	// TileSet.load
	async load(url, styleParams) {
	  this.url = url;
	  let resourcePath = THREE.LoaderUtils.extractUrlBase(url);
	  
	  let response = await fetch(this.url);
	  if (!response.ok) {
		throw new Error(`HTTP ${response.status} - ${response.statusText}`);
	  }
	  let json = await response.json();    
	  this.version = json.asset.version;
	  this.geometricError = json.geometricError;
	  this.refine = json.root.refine ? json.root.refine.toUpperCase() : 'ADD';
	  this.root = new ThreeDeeTile(json.root, resourcePath, styleParams, this.updateCallback, this.refine);
	  return;
	}
}
