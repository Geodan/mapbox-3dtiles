import TilesetLayer from './TilesetLayer.mjs';

export default class TilesetManager {
    constructor(world, loader, tilesetConfigs) {
        this.loaded = false;
        this.world = world;
        this.loader = loader;
        this.tilesetLayers = [];
        this.initTilesetConfigs = tilesetConfigs;
    }

    load(map, cameraSync) {
        this.map = map;
        this.map.on('move', () => this._moving());
        this.cameraSync = cameraSync;
        this._createTilesetsFromConfig(this.initTilesetConfigs);
        this.initTilesetConfigs = [];
        this.loaded = true;
    }

    getTilesets() {
        return this.tilesetLayers.map((t) => { return { id: t.tilesetId, tileset: t } });
    }

    getTileset(id) {
        for(let i = 0; i < this.tilesetLayers.length; i++) {
            if(this.tilesetLayers[i].tilesetId == id) {
                return this.tilesetLayers[i];
            }
        }

        return undefined;
    }

    addTileset(tilesetConfig) {
        if (this.loaded === false) {
            this.initTilesetConfigs.push(tilesetConfig);
        } else {
            this._createTilesetsFromConfig([tilesetConfig]);
        }
    }

    removeTileset(id) {
        let tilesetLayer = {};

        for (let i = 0; i < this.tilesetLayers; i++) {
            if (this.tilesetLayers[i].id == id) {
                tilesetLayer = this.tilesetLayers[i];
                break;
            }
        }

        this._removeTilesetLayer(tilesetLayer);
    }

    _addTilesetLayer(layer) {
        this.tilesetLayers.push(layer);
        this.world.add(layer);
        this.cameraSync.updateCamera();
    }

    _removeTilesetLayer(layer) {
        this.world.remove(layer);
        let position = this.tilesetLayers.indexOf(layer);
        this.tilesetLayers.splice(position, 1);
    }

    _createTilesetsFromConfig(tilesets) {
        for (let i = 0; i < tilesets.length; i++) {
            const tilesetConfig = tilesets[i];
            const tilesetLayer = this._createTilesetLayer(tilesetConfig);
            this._addTilesetLayer(tilesetLayer);
        }
    }

    _createTilesetLayer(tilesetConfig) {
        const tilesetLayer = new TilesetLayer(this.map, this.loader, this.cameraSync, tilesetConfig, ()=> this._renderCallback());
        tilesetLayer.load();
        return tilesetLayer;
    }

    _moving() {
        if (this.timeoutHandle) {
            window.clearTimeout(this.timeoutHandle);
        }
    }

    _renderCallback() {
        if (this.timeoutHandle) {
            window.clearTimeout(this.timeoutHandle);
        }

        this.timeoutHandle = window.setTimeout(() => { this._runRequestRender() }, 100);
    }

    _runRequestRender() {
        this.map.triggerRepaint();
    }
}
