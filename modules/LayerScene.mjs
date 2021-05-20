import * as THREE from 'three';

export default class LayerScene extends THREE.Scene {
    constructor(map, cameraSync, world) {
        super();

        this.map = map;
        this.cameraSync = cameraSync;
        this.world = world;
        
        this.lights = this._createLight();
        this.shadowMaterial = this._createShadowMaterial();
        this.shadowPlane = this._createShadowPlane(this.shadowMaterial);

        this.lights.forEach((light) => {
            this.add(light);
        });

        this.add(this.world);
        this.addShadow();

        this.map.on('move', ()=>this._cameraUpdated());
        this._setBelowSurfaceState();
    }

    // Terrain shadow only working when something with transparant material is added to the scene
    // ToDo: figure out why it does not work without
    addTerrainShadowWorkaround() {
        const geometry = new THREE.BoxGeometry( 1, 1, 1 );
        const material = new THREE.MeshBasicMaterial( {transparent: true} );
        const cube = new THREE.Mesh( geometry, material );
        this.add(cube);
    }

    addShadow() {
        this.add(this.shadowPlane);
    }

    removeShadow() {
        this.remove(this.shadowPlane);
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

    _createLight() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0xbebebe, 0.7);
        const dirLight = this._getDefaultDirLight(width, height);

        return [ hemiLight, dirLight];
    }

    _getDefaultDirLight(width, height) {
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
        dirLight.color.setHSL(0.1, 1, 0.95);
        dirLight.position.set(-1, -1.75, 1);
        dirLight.position.multiplyScalar(100);
        dirLight.castShadow = true;
        dirLight.shadow.camera.near = -10000;
        dirLight.shadow.camera.far = 30000;
        dirLight.shadow.radius = 5;
        dirLight.shadow.bias = -0.0002;
        dirLight.shadow.mapSize.width = width * 4;
        dirLight.shadow.mapSize.height = height * 10;
        dirLight.shadow.camera.left = -width;
        dirLight.shadow.camera.right = width;
        dirLight.shadow.camera.top = -height * 2.5;
        dirLight.shadow.camera.bottom = height * 2.5;
        dirLight.uuid = 'shadowlight';

        return dirLight;
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
        shadowPlane.castShadow = false;

        return shadowPlane;
    }

    _cameraUpdated() {
        this.cameraHeight = this.cameraSync.cameraPosition.z;

        if ((!this.belowSurface && this.cameraHeight < 0) || (this.belowSurface && this.cameraHeight >= 0)) {
            this._setBelowSurfaceState();
        }
    }

    _createSurfacePlane() {
        var geo = new THREE.PlaneBufferGeometry(30000, 30000, 1, 1);
        var mat = new THREE.MeshBasicMaterial({
            color: 0xc0c0c0,
            side: THREE.BackSide,
            opacity: 0.6,
            transparent: true,
            depthWrite: false
        });
        const plane = new THREE.Mesh(geo, mat);

        return plane;
    }

    _setBelowSurfaceState() {
        const newState = this.cameraHeight < 0 ? true : false;
        if (this.belowSurface && newState == this.belowSurface) {
            return;
        }

        this.belowSurface = newState;
        this._update(this.belowSurface);
    }

    _update(belowSurface) {
        if (belowSurface) {
            this._addSurfacePlane();
        } else {
            this._removeSurfacePlane();
        }
    }

    _addSurfacePlane() {
        this.surfacePlane = this._createSurfacePlane();
        this.add(this.surfacePlane);
    }

    _removeSurfacePlane() {
        if (!this.surfacePlane) {
            return;
        }

        this.remove(this.surfacePlane);
        this.surfacePlane.geometry.dispose();
        this.surfacePlane.material.dispose();
        delete this.surfacePlane;
    }
}
