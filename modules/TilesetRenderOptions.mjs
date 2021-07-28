
export class TilesetRenderOptions  {

    constructor(params, changed) {
        if(!params) {
            params = {};
        }

        this.opacity = params.hasOwnProperty('opacity') ? params.opacity : 1.0;
        this.horizonClip = params.hasOwnProperty('horizonClip') ? params.horizonClip : false;
        this.horizonFactor = params.hasOwnProperty('horizonFactor') ? params.horizonFactor : 200;
        this.castShadow = params.hasOwnProperty('castShadow') ? params.castShadow : true;
        this.receiveShadow = params.hasOwnProperty('receiveShadow') ? params.receiveShadow : true;
        this.doubleSided = params.hasOwnProperty('doubleSided') ? params.doubleSided : false;
        this._changed = changed;
    }

    get opacity() {
        return this["_opacity"];
    }

    set opacity(value) {
        if (!isNaN(value)) {
            this.updateValue("_opacity", value)
        }
    }

    get horizonClip() {
        return this["_horizonClip"];
    }

    set horizonClip(value) {
        if (typeof value === 'boolean') {
            this.updateValue("_horizonClip", value)
        }
    }
   
    get horizonFactor() {
        return this["_horizonFactor"];
    }

    set horizonFactor(value) {
        if (!isNaN(value)) {
            this.updateValue("_horizonFactor", value)
        }
    }

    get castShadow() {
        return this["_castShadow"];
    }

    set castShadow(value) {
        if (typeof value === 'boolean') {
            this.updateValue("_castShadow", value)
        }
    }

    get receiveShadow() {
        return this["_receiveShadow"];
    }

    set receiveShadow(value) {
        if (typeof value === 'boolean') {
            this.updateValue("_receiveShadow", value)
        }
    }

    get doubleSided() {
        return this["_doubleSided"];
    }

    set doubleSided(value) {
        if (typeof value === 'boolean') {
            this.updateValue("_doubleSided", value)
        }
    }

    updateValue(propertyName, newVal) {
        if(newVal === undefined) {
            return;
        }

        if(this[propertyName] != newVal) {
            this[propertyName] = newVal;

            if(this._changed !== undefined) {
                this._changed();
            }
        }
    } 
}
