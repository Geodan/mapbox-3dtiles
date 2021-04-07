/*
When Subsurface is active in Mapbox3DTiles listen on camera going below or above the surface
Add a plane when going below the surface, show the layer
Remove the surface plane when going above surface, hide the layer
*/
class Subsurface {
    constructor(map, world, cameraSync) {
        this.map = map;
        this.world = world;
        this.cameraSync = cameraSync;
        this.map.on('move', () => this._cameraUpdated());
        this._setBelowSurfaceState();
    }

    _cameraUpdated() {
        this.cameraHeight = this.cameraSync.cameraPosition.z;

        if (!this.belowSurface && this.cameraHeight < 0 || this.belowSurface && this.cameraHeight >= 0) {
            this._setBelowSurfaceState();
        }
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
            this._showLayer();
        }else{
            this._hideLayer();
        }
    }

     _showLayer() {
        this.world.visible = true;
     }

     _hideLayer() {
        this.world.visible = false;
     }
}

export default Subsurface;