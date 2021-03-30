import * as THREE from 'three';
import CameraSync from './CameraSync.mjs';

let instance = null;

class SceneManager {

    constructor(map) {
        if (instance) {
            return instance;
        }

        this._setup(map);
        instance = this;
    }

    _setup(map) {
        this.map = map;
        this.gl = this.map._canvas.getContext('webgl');
        this.layers = [];
        this.camera = this._createCamera();
        this.world = this._createWorld();
        this.cameraSync = this._createCameraSync(this.map, this.camera, this.world);

        window.addEventListener('resize', (e) => {
            this._resize(e);
        });
    }

    addLayer(layer) {
        this.layers.push(layer);
        this.cameraSync.addWorld(layer.world);
        this.cameraSync.updateCamera();
    }

    removeLayer(layer) {
        this.cameraSync.removeWorld(layer.world);
        let position = this.layers.indexOf(layer);
        this.layers.splice(position, 1);
    }

    _createCamera() {
        const camera = new THREE.PerspectiveCamera(0, 0, 0, 0);
        return camera;
    }

    _createCameraSync(map, camera, world) {
        const cameraSync = new CameraSync(map, camera, world);
        cameraSync.aspect = window.innerWidth / window.innerHeight;
        cameraSync.updateCallback = () => this._loadVisibleTiles();
        camera.updateProjectionMatrix();

        return cameraSync;
    }

    _createWorld() {
        const world = new THREE.Group();
        return world;
    }

    _loadVisibleTiles() {
        for (let i = 0; i < this.layers.length; i++) {
            this.layers[i].loadVisibleTiles(this.cameraSync.frustum, this.cameraSync.cameraPosition);
        }
    }

    _resize(e) {
        let width = window.innerWidth;
        let height = window.innerHeight;
        this.cameraSync.aspect = width / height;
        this.camera.aspect = width / height;
    }
}

export default SceneManager;