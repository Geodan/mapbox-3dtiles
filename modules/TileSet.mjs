import * as THREE from 'three';
import ThreeDeeTile from './ThreeDeeTile.mjs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';

export default class TileSet {
    constructor(updateCallback) {
        if (!updateCallback) {
            updateCallback = () => {};
        }
        this.updateCallback = updateCallback;
        this.url = null;
        this.version = null;
        this.gltfUpAxis = 'Z';
        this.geometricError = null;
        this.root = null;
        let dracoloader = new DRACOLoader().setDecoderPath('https://unpkg.com/three@0.125.2/examples/js/libs/draco/');
        this.loader = new GLTFLoader().setDRACOLoader(dracoloader).setKTX2Loader(new KTX2Loader());
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
            this.refine,
            null,
            projectToMercator,
            this.loader
        );
        return;
    }
}
