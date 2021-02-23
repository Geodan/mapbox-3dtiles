import * as THREE from 'three';
import ThreeDeeTile from './ThreeDeeTile.mjs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';

export default class TileSet {

    constructor(updateCallback, renderCallback, dracoEnabled) {
        if (!updateCallback) { updateCallback = () => {}; }
        this.updateCallback = updateCallback;
        this.renderCallback = renderCallback;
        this.dracoEnabled = dracoEnabled;
        this.url = null;
        this.version = null;
        this.gltfUpAxis = 'Z';
        this.geometricError = null;
        this.root = null;
        this._createLoader();
    }

    _createLoader() {
        this.loader = new GLTFLoader().setKTX2Loader(new KTX2Loader());

        if(this.dracoEnabled) {
            this.loader.setDRACOLoader(new DRACOLoader().setDecoderPath('/assets/draco/'));
        } 
    }

    // TileSet.load
    async load(url, styleParams, projectToMercator) {
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
        this.root = new ThreeDeeTile(
            json.root,
            resourcePath,
            styleParams,
            this.updateCallback,
            this.renderCallback,
            this.refine,
            null,
            projectToMercator,
            this.loader,
            this.dracoEnabled
        );
        return;
    }
}
