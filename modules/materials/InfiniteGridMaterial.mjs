import * as THREE from 'three';

import InfiniteGridVert from '../shaders/InfiniteGridVert.glsl.js';
import InfiniteGridFrag from '../shaders/InfiniteGridFrag.glsl.js';

export class InfiniteGridMaterial extends THREE.ShaderMaterial {
    constructor(origin, size1, size2, color, distance) {
        super();

        this.side = THREE.DoubleSide;
        this.defines = {};
        this.uniforms = this._getUniforms(origin, size1, size2, color, distance);
        this.vertexShader = InfiniteGridVert;
        this.fragmentShader = InfiniteGridFrag;
        this.transparent = true;
        this.extensions = {
            derivatives: true
        };
    }

    _getUniforms(origin, size1, size2, color, distance) {
        color = color ? new THREE.Color(color) : new THREE.Color('red');
        size1 = size1 || 10;
        size2 = size2 || 100;
        distance = distance || 2000;

        return {
            uSize1: {
                value: size1
            },
            uSize2: {
                value: size2
            },
            uColor: {
                value: color
            },
            uDistance: {
                value: distance
            },
            uMapCenterWorld: {
                value: new THREE.Vector3(0, 0, 0)
            },
            uMapCameraWorld: {
                value: new THREE.Vector3(0, 0, 0)
            },
            uOrigin: {
                value: new THREE.Vector3(origin.x, origin.y, origin.z)
            }
        };
    }
}
