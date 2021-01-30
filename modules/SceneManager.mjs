import * as THREE from 'three';
import CameraSync from './CameraSync.mjs';

class SceneManager {

    static instance;

    constructor(map, gl) {
        if (SceneManager.instance) {
            return SceneManager.instance;
        }

        this.map = map;
        this.gl = gl;
        this.layers = [];

        this._createRenderer();
        this._createScene();
        this._addShadow();
        this._createCamera();

        this.map.on('render', () => this._update());
        window.addEventListener('resize', (e) => {
            this._resize(e);
        });

        SceneManager.instance = this;
    }

    addLayer(layer, world) {
        this.layers.push(layer);
        this.world.add(world);
    }

    _createCamera() {
        const fov = 36.8;
        const aspect = this.map.getCanvas().width / this.map.getCanvas().height;
        const near = 0.000000000001;
        const far = Infinity;
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        this.cameraSync = new CameraSync(this.map, this.camera, this.world);
        this.cameraSync.aspect = width / height;
        this.cameraSync.updateCallback = () => this._loadVisibleTiles();
        this.camera.updateProjectionMatrix();
    }

    _createScene() {
        this.scene = new THREE.Scene();
        this._getDefaultLights().forEach((light) => {
            this.scene.add(light);
        });

        this.world = new THREE.Group();
        this.scene.add(this.world);
    }

    _createRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
            canvas: this.map.getCanvas(),
            context: this.gl
        });

        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowMap;
        this.renderer.autoClear = false;
    }

    _getDefaultLights() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0xbebebe, 0.7);
        const dirLight = this._getDefaultDirLight(width, height);

        return [hemiLight, dirLight];
    }

    _getDefaultDirLight(width, height) {
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
        dirLight.color.setHSL(0.1, 1, 0.95);
        dirLight.position.set(-1, -1.75, 1);
        dirLight.position.multiplyScalar(100);
        dirLight.castShadow = true;
        dirLight.shadow.camera.near = -10000;
        dirLight.shadow.camera.far = 2000000;
        dirLight.shadow.bias = 0.0038;
        dirLight.shadow.mapSize.width = width;
        dirLight.shadow.mapSize.height = height * 2.5;
        dirLight.shadow.camera.left = -width;
        dirLight.shadow.camera.right = width;
        dirLight.shadow.camera.top = -height * 2.5;
        dirLight.shadow.camera.bottom = height * 2.5;
        dirLight.uuid = 'shadowlight';

        return dirLight;
    }

    _addShadow() {
        var planeGeometry = new THREE.PlaneBufferGeometry(10000, 10000, 1, 1);
        this.shadowMaterial = new THREE.ShadowMaterial();
        this.shadowMaterial.opacity = 0.3;
        this.shadowPlane = new THREE.Mesh(planeGeometry, this.shadowMaterial);
        this.shadowPlane.receiveShadow = true;
        this.scene.add(this.shadowPlane);
    }

    _removeShadow() {
        this.scene.remove(this.shadowPlane);
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
        //this.composer.setSize(width, height);

        /*for (let i = 0; i < this.scene.children.length; i++) {
            let c = this.scene.children[i];
            if (c.uuid === 'shadowlight') {
                c = this._getDefaultDirLight(width, height);
            }
        }*/
    }

    _update() {
        this.renderer.state.reset();
        this.renderer.render(this.scene, this.camera);
    }
}

export default SceneManager;