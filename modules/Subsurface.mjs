import * as THREE from 'three';

/*
When Subsurface is active in Mapbox3DTiles listen on camera going below or above the surface
Add a plane when going below the surface, show the layer
Remove the surface plane when going above surface, hide the layer
*/
class Subsurface {
    constructor(scene, world, cameraSync) {
        this.scene = scene;
        this.world = world;
        this.cameraSync = cameraSync;
        this.cameraSync.updateCallback = () => this._cameraUpdated();
        this._setBelowSurfaceState();
    }

    _cameraUpdated() {
        this.cameraHeight = this.cameraSync.cameraPosition.z;

        if (!this.belowSurface && this.cameraHeight < 0 || this.belowSurface && this.cameraHeight >= 0) {
            this._setBelowSurfaceState();
        }
    }

    _createSurfacePlane() {
        var geo = new THREE.PlaneBufferGeometry(30000, 30000, 1, 1);
        var mat = new THREE.MeshBasicMaterial({ color: 0xC0C0C0, side: THREE.BackSide, opacity: 0.6, transparent: true, depthWrite: false });
        const plane = new THREE.Mesh(geo, mat);

        return plane;
    }

    _setBelowSurfaceState() {
        const newState = this.cameraHeight < 0 ? true : false;
        if(this.belowSurface && newState == this.belowSurface){
            return;
        }

        this.belowSurface = newState;
        this._update(this.belowSurface);
    }

    _update(belowSurface) {
        if(belowSurface){
            this._addSurfacePlane();
            this._showLayer();
        }else{
            this._removeSurfacePlane();
            this._hideLayer();
        }
    }

    _addSurfacePlane() {
        this.surfacePlane = this._createSurfacePlane();
        this.scene.add(this.surfacePlane);
     }

     _removeSurfacePlane() {
         if(!this.surfacePlane) {
             return;
         }

         this.scene.remove(this.surfacePlane);
         this.surfacePlane.geometry.dispose();
         this.surfacePlane.material.dispose();
         delete this.surfacePlane;
     }

     _showLayer() {
        this.world.visible = true;
     }

     _hideLayer() {
        this.world.visible = false;
     }
}

export default Subsurface;