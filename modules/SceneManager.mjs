import * as THREE from 'three';
import CameraSync from './CameraSync.mjs';
import { ThreeboxConstants } from './Constants.mjs';

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
        this.light = this._createLight();
        this.world = this._createWorld();
        this.renderer = this._createRenderer(this.map, this.gl);
        this.scene = this._createScene(this.world, this.light);
        this.cameraSync = this._createCameraSync(this.map, this.camera, this.world);
        this.shadowMaterial = this._createShadowMaterial();
        this.shadowPlane = this._createShadowPlane(this.shadowMaterial);

        this.addShadow();

        this.map.on('render', () => this._update());
        window.addEventListener('resize', (e) => {
            this._resize(e);
        });
    }

    addLayer(layer, layerWorld) {
        layerWorld.position.x = layerWorld.position.y = ThreeboxConstants.WORLD_SIZE / 2;
        layerWorld.matrixAutoUpdate = false;

        this.world.add(layerWorld);
        this.layers.push(layer);
        this._loadVisibleTiles();

        // ToDo @time: layer not updating when added, should fix this in a nice way
        setTimeout(() => {  this.map.setCenter(this.map.getCenter()); }, 500);
    }

    removeLayer(layer) {
        for (let i = 0; i < this.layers.length; i++) {
            if (this.layers[i] === layer) {
                this.layers.splice(i, 1);
                this.world.remove(layer.world);                
            }
        }
    }

    addShadow() {
        this.scene.add(this.shadowPlane);
    }

    removeShadow() {
        this.scene.remove(this.shadowPlane);
    }

    setShadowOpacity(opacity) {
        const newOpacity = opacity < 0 ? 0.0 : opacity > 1 ? 1.0 : opacity;
        this.shadowMaterial.opacity = newOpacity;
    }

    setHemisphereIntensity(intensity) {
        if (this.lights[0] instanceof THREE.HemisphereLight) {
            const newIntensity = intensity < 0 ? 0.0 : intensity > 1 ? 1.0 : intensity;
            this.lights[0].intensity = newIntensity;
        }
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

    _createLight() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0xbebebe, 0.7);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
        dirLight.color.setHSL(0.1, 1, 0.95);
        dirLight.position.set(-1, -1.75, 1);
        dirLight.position.multiplyScalar(100);
        dirLight.castShadow = true;
        dirLight.shadow.radius = 4;
        dirLight.shadow.camera.near = -1000;
        dirLight.shadow.camera.far = 2000000;
        dirLight.shadow.bias = 0.0038;
        dirLight.shadow.mapSize.width = width;
        dirLight.shadow.mapSize.height = height * 2.5;
        dirLight.shadow.camera.left = -width;
        dirLight.shadow.camera.right = width;
        dirLight.shadow.camera.top = -height * 2.5;
        dirLight.shadow.camera.bottom = height * 2.5;
        dirLight.uuid = 'shadowlight'

        return [hemiLight, dirLight];
    }

    _createWorld() {
        const world = new THREE.Group();
        return world;
    }

    _createScene(world, light) {
        const scene = new THREE.Scene();
        light.forEach((light) => {
            scene.add(light);
        });

        scene.add(world);
        return scene;
    }

    _createRenderer(map, gl) {
        const renderer = new THREE.WebGLRenderer({
            alpha: false,
            antialias: true,
            powerPreference: 'high-performance',
            desynchronized: true,
            canvas: map.getCanvas(),
            context: gl
        });

        renderer.shadowMapSoft = true;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFShadowMap;
        renderer.autoClear = false;

        return renderer;
    }

    _createShadowMaterial() {
        const shadowMaterial = new THREE.ShadowMaterial();
        shadowMaterial.opacity = 0.09;

        return shadowMaterial;
    }

    _createShadowPlane(shadowMaterial) {
        var planeGeometry = new THREE.PlaneBufferGeometry(10000, 10000, 1, 1);
        const shadowPlane = new THREE.Mesh(planeGeometry, shadowMaterial);
        shadowPlane.receiveShadow = true;

        return shadowPlane;
    }

    _loadVisibleTiles() {
        for (let i = 0; i < this.layers.length; i++) {
            this.layers[i].loadVisibleTiles(this.cameraSync.frustum, this.cameraSync.cameraPosition);
        }
    }

    _resize(e) {
        let width = window.innerWidth;
        let height = window.innerHeight;
        this.renderer.setSize(width, height);
        this.cameraSync.aspect = width / height;
        this.camera.aspect = width / height;
    }

    _update() {
        this.renderer.state.reset();
        this.renderer.render(this.scene, this.camera);
    }
}

export default SceneManager;