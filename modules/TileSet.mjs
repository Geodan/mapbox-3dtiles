import * as THREE from 'three';
import ThreeDeeTile from './ThreeDeeTile.mjs';

export default class TileSet {

    constructor(updateCallback, renderCallback, loader, id = undefined) {
        if (!updateCallback) { updateCallback = () => {}; }
        this.updateCallback = updateCallback;
        this.renderCallback = renderCallback;
        this.id = id;
        this.url = null;
        this.version = null;
        this.gltfUpAxis = 'Z';
        this.geometricError = null;
        this.root = null;
        this.loader = loader;
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
            this.loader
        );

        if(this.id) {
            this.root.totalContent.isTileset = true;
            this.root.totalContent.tileset = this.id;
        }
        
        return;
    }
}
