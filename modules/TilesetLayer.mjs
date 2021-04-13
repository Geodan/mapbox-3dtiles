import * as THREE from 'three';

import Tileset from './Tileset.mjs';
import Subsurface from './Subsurface.mjs';
import applyStyle from './Styler.mjs'

export default class TilesetLayer extends THREE.Scene {

    constructor(map, loader, cameraSync, settings) {
        super();

        if (!settings.id) throw new Error('id parameter missing for layer');
        if (!settings.url) throw new Error('url parameter missing for layer');

        this.map = map;
        this.loader = loader;
        this.cameraSync = cameraSync;
        this.tilesetId = settings.id;
        this.url = settings.url;
        this.projectToMercator = settings.projectToMercator == undefined ? true : settings.projectToMercator;
        this.style = {};
        this.setStyle(settings.style);
        this.subsurface = settings.subsurface ? settings.subsurface : false;
        this.tileset = {};

        if (settings.subsurface && settings.subsurface === true) {
            this._addSubsurfaceSupport();
        }
    }

    setStyle(style) {
        if(!style) {
            return;
        }
        
        this.style.id = style.id ? style.id : undefined;
        this.style.type = style.type ? style.type : undefined;
        this.style.settings = style.settings ? style.settings : undefined;
        applyStyle(this, this.style);
        this._renderCallback();
    }

    getStyle() {
        return this.style;
    }

    _addSubsurfaceSupport() {
        this.subsurface = new Subsurface(this.map, this, this.cameraSync);
    }

    _updateCallback() {
        if (this.tileset.loaded) {
            this.tileset.styleParams = this.style;
            this.map.triggerRepaint();
        }
    }

    _renderCallback() {
        this.map.triggerRepaint();
    }

    _logError(error) {
        console.error(`${error} (${this.id}: ${this.url})`);
    }

    _addTilesetContent() {
        if (this.tileset.root) {
            this.add(this.tileset.root.totalContent);
        }
    }

    _initUpdate() {
        this.map.setCenter(this.map.getCenter());
    }

    async load() {
        this.tileset = new Tileset(()=> this._updateCallback(), ()=> this._renderCallback(), this.loader, this.id);
        await this.tileset.load(this.url, this.style, this.projectToMercator)
            .then(async () => {
                this._addTilesetContent();
                // delay an map update since we have to wait to download the tilesets
                setTimeout(() => { this._initUpdate() }, 1000);
            })
            .catch((error) => this._logError(error));
    }
    
    async checkLoad(cameraFrustum, cameraPosition) {
        this.cameraFrustum = cameraFrustum;
        this.cameraPosition = cameraPosition;

        if (this.tileset && this.tileset.root) {
            await this.tileset.root.checkLoad(cameraFrustum, cameraPosition, this.tileset.geometricError);
        }
    }
}
