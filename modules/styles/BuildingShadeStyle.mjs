import * as THREE from 'three';
import { BuildingShadeMaterial } from '../materials/BuildingShadeMaterial.mjs';

export class BuildingShadeStyle {
    constructor(id, params = {}) {
        this.type = 'shader';
        this.id = id === undefined ? Math.random().toString().replace('0.', '') : id;
        this.shadeOffset = params.shadeOffset ? params.shadeOffset : 0.0;

        this.settings = {
            material: this._createBuildingMaterial(params),
            setAttributes: (geom) => this.setAttributes(geom)
        };
    }

    _createBuildingMaterial(params) {
        const colorA = params.colorA ? params.colorA : 0x807e7e;
        const colorB = params.colorB ? params.colorB : 0xbedcda;
        const emissive = params.emissive ? params.emissive : 0x000000;
        const specular = params.specular ? params.specular : 0x111111;
        const shininess = params.shininess ? params.shininess : 30;

        return new BuildingShadeMaterial(colorA, colorB, emissive, specular, shininess);
    }

    setAttributes(geom) {
        const batchColors = {};
        const count = geom.attributes.position.count;
        geom.setAttribute('height', new THREE.BufferAttribute(new Float32Array(count), 1));
        const heights = geom.attributes.height;

        // get min and max height per batch
        for (let i = 0; i < count; i++) {
            const batchID = geom.attributes._batchid.getX(i);
            if (batchColors[batchID] === undefined) {
                batchColors[batchID] = {
                    min: undefined,
                    max: undefined
                };
            }

            const vPos = geom.attributes.position.getY(i);
            const min = batchColors[batchID].min;
            const max = batchColors[batchID].max;

            if (min === undefined || vPos < min) {
                batchColors[batchID].min = vPos;
            }

            if (max === undefined || vPos > max) {
                batchColors[batchID].max = vPos;
            }
        }

        // calculate height percentage per position and set attribute
        for (let i = 0; i < count; i++) {
            const batchID = geom.attributes._batchid.getX(i);
            const min = batchColors[batchID].min;
            const max = batchColors[batchID].max;
            const yPos = geom.attributes.position.getY(i);
            let height = ((yPos - min) * (1 + this.shadeOffset - 0)) / (max - min) + 0;
            height = height > 1.0 ? 1.0 : height;
            heights.setX(i, height);
        }
    }
}
