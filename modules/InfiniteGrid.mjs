import * as THREE from 'three';
import { projectToWorld } from './Utils.mjs';
import { InfiniteGridMaterial } from './materials/InfiniteGridMaterial.mjs';

export class InfiniteGrid extends THREE.Mesh {
    constructor(map, cameraSync, height, size1, size2, color, distance) {
        super(new THREE.PlaneBufferGeometry(2, 2, 1, 1));

        this.map = map;
        this.cameraSync = cameraSync;
        this.frustumCulled = false;
        this.mapCenterWorld = this._getMapCenterWorld();
        this.material = new InfiniteGridMaterial(this.mapCenterWorld, size1, size2, color, distance);
        this.position.set(this.mapCenterWorld.x, this.mapCenterWorld.y, height);

        this._updateGrid = () => this._update();
        this.map.on('move', this._updateGrid);
    }

    _getMapCenterWorld() {
        const center = this.map.getCenter();
        const location = [center.lng, center.lat, 0];
        return projectToWorld(location);
    }

    _update() {
        if(!this.map) {
            return;
        }

        const mapCenterWorld = this._getMapCenterWorld();

        this.material.uniforms.uMapCenterWorld.value = new THREE.Vector3(
            mapCenterWorld.x,
            mapCenterWorld.y,
            mapCenterWorld.z
        );

        this.material.uniforms.uMapCameraWorld.value = new THREE.Vector3(
            this.cameraSync.cameraPosition.x,
            this.cameraSync.cameraPosition.y,
            this.cameraSync.cameraPosition.z
        );

        this.material.needsUpdate = true;
    }

    dispose() {
        this.map.off('move', this._updateGrid);

        this.material.dispose();
        this.material = undefined;
        this.map = undefined;
        this.cameraSync = undefined;
        this.mapCenterWorld = undefined;        
    }
}
