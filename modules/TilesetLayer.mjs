import * as THREE from 'three';

import Tileset from './Tileset.mjs';
import Subsurface from './Subsurface.mjs';
import applyStyle from './Styler.mjs'

export default class TilesetLayer extends THREE.Scene {

    constructor(map, loader, cameraSync, settings, renderCallback) {
        super();

        if (!settings.id) throw new Error('id parameter missing for layer');
        if (!settings.url) throw new Error('url parameter missing for layer');

        this.map = map;
        this.loader = loader;
        this.cameraSync = cameraSync;
        this.renderCallback = renderCallback;
        this.tilesetId = settings.id;
        this.url = settings.url;
        this.projectToMercator = settings.projectToMercator === undefined ? false : settings.projectToMercator;
        this.style = { opacity: 1.0 };
        this.setStyle(settings.style);
        this.renderOptions = { 
            horizonClip: true, 
            horizonFactor: 200, 
            castShadow: true, 
            receiveShadow: true, 
            doubleSided: false
        };
        this.setRenderOptions(settings.renderOptions);
        this.subsurface = settings.subsurface ? settings.subsurface : false;
        this.tileset = {};

        if (settings.subsurface && settings.subsurface === true) {
            this._addSubsurfaceSupport();
        }
    }

    applyRenderOptions(scene, renderOptions) {
        scene.traverse(child => {
            if (child instanceof THREE.Mesh) {
                child.material.castShadow = renderOptions.castShadow;
                child.material.receiveShadow = renderOptions.receiveShadow;
                if (renderOptions.doubleSided) {
                    child.material.side = THREE.DoubleSide;
                } else {
                    child.material.side = THREE.FrontSide;
                }
            }
        });
    }

    updateRenderOptions() {
        this.applyRenderOptions(this, this.renderOptions);
        this.renderCallback();
    }

    setRenderOptions(newOptions) {
        if (!newOptions) {
            return;
        }
        let changed = false;
        let curOptions = this.renderOptions;
        if (newOptions.hasOwnProperty('horizonClip')) {
            if (curOptions.horizonClip !== newOptions.horizonClip && typeof newOptions.horizonClip === 'boolean') {
                curOptions.horizonClip = newOptions.horizonClip;
                changed = true;
            }
        }
        if (newOptions.hasOwnProperty('horizonFactor')) {
            if (curOptions.horizonFactor !== newOptions.horizonFactor && !isNaN(newOptions.horizonFactor)) {
                curOptions.horizonFactor = newOptions.horizonFactor;
                changed = true;
            }
        }
        if (newOptions.hasOwnProperty('castShadow')) {
            if (curOptions.castShadow !== newOptions.castShadow && typeof newOptions.castShadow === 'boolean') {
                curOptions.castShadow = newOptions.castShadow;
                changed = true;
            }
        }
        if (newOptions.hasOwnProperty('receiveShadow')) {
            if (curOptions.receiveShadow !== newOptions.receiveShadow && typeof newOptions.receiveShadow === 'boolean') {
                curOptions.receiveShadow = newOptions.receiveShadow;
                changed = true;
            }
        }
        if (newOptions.hasOwnProperty('doubleSided')) {
            if (curOptions.doubleSided !== newOptions.doubleSided && typeof newOptions.doubleSided === 'boolean') {
                curOptions.doubleSided = newOptions.doubleSided;
                changed = true;
            }
        }
        if (changed) {
            this.updateRenderOptions();
        }
    }

    setStyle(style) {
        if(!style) {
            return;
        }
        
        this.style.id = style.id ? style.id : undefined;
        this.style.type = style.type ? style.type : undefined;
        this.style.settings = style.settings ? style.settings : undefined;
        this.style.opacity = style.opacity ? style.opacity : this.style.opacity;
        this.updateStyle();
    }

    updateStyle() {
        applyStyle(this, this.style);
        this.renderCallback();
    }

    getStyle() {
        return this.style;
    }

    getOpacity() {
        return this.style.opacity;
    }

    setOpacity(opacity) {
        this.style.opacity = opacity;
        this.updateStyle();
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
        this.tileset = new Tileset(()=> this._updateCallback(), this.renderCallback, this.loader, this.id);
        await this.tileset.load(this.url, this.style, this.projectToMercator, this.renderOptions)
            .then(async () => {
                this._addTilesetContent();
                // delay an map update since we have to wait to download the tilesets
                setTimeout(() => { this._initUpdate() }, 1500);
            })
            .catch((error) => this._logError(error));
        this.renderCallback();
    }
    
    async checkLoad(cameraFrustum, cameraPosition) {
        this.cameraFrustum = cameraFrustum;
        this.cameraPosition = cameraPosition;

        if (this.tileset && this.tileset.root) {
            this.tileset.root.checkLoad(cameraFrustum, cameraPosition, this.tileset.geometricError);
        }
    }
}
