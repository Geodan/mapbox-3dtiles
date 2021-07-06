import * as THREE from 'three';

import BuildingShadeVert from '../shaders/BuildingShadeVert.glsl.js';
import BuildingShadeFrag from '../shaders/BuildingShadeFrag.glsl.js';

export class BuildingShadeMaterial extends THREE.ShaderMaterial {
    constructor(colorA = 0x332400, colorB = 0x506a80, emissive = 0x000000, specular = 0x2d2c2c, shininess = 1) {
        super();
        this.uniforms = this._getUniforms(colorA, colorB, emissive, specular, shininess);
        this.defines = {};
        this.lights = true;
        this.fog = true;
        this.vertexShader = BuildingShadeVert;
        this.fragmentShader = BuildingShadeFrag;
    }

    _getUniforms(colorA, colorB, emissive, specular, shininess) {
        return {
            colorA: { type: 'vec3', value: new THREE.Color(colorA) },
            colorB: { type: 'vec3', value: new THREE.Color(colorB) },
            diffuse: { value: new THREE.Color(0xffffff) },
            opacity: { value: 1.0 },
            emissive: { value: new THREE.Color(emissive) },
            specular: { value: new THREE.Color(specular) },
            shininess: { value: shininess },
            map: { value: null },
            uvTransform: { value: new THREE.Matrix3() },
            uv2Transform: { value: new THREE.Matrix3() },
            alphaMap: { value: null },
            specularMap: { value: null },
            envMap: { value: null },
            flipEnvMap: { value: -1 },
            reflectivity: { value: 1.0 },
            refractionRatio: { value: 0.98 },
            maxMipLevel: { value: 0 },
            aoMap: { value: null },
            aoMapIntensity: { value: 1 },
            lightMap: { value: null },
            lightMapIntensity: { value: 1 },
            emissiveMap: { value: null },
            bumpMap: { value: null },
            bumpScale: { value: 1 },
            normalMap: { value: null },
            normalScale: { value: new THREE.Vector2(1, 1) },
            displacementMap: { value: null },
            displacementScale: { value: 1 },
            displacementBias: { value: 0 },
            fogDensity: { value: 0.00025 },
            fogNear: { value: 1 },
            fogFar: { value: 2000 },
            fogColor: { value: new THREE.Color(0xffffff) },
            ambientLightColor: { value: [] },
            lightProbe: { value: [] },
            directionalLights: {
                value: [],
                properties: {
                    direction: {},
                    color: {}
                }
            },
            directionalLightShadows: {
                value: [],
                properties: {
                    shadowBias: {},
                    shadowNormalBias: {},
                    shadowRadius: {},
                    shadowMapSize: {}
                }
            },
            directionalShadowMap: { value: [] },
            directionalShadowMatrix: { value: [] },
            spotLights: {
                value: [],
                properties: {
                    color: {},
                    position: {},
                    direction: {},
                    distance: {},
                    coneCos: {},
                    penumbraCos: {},
                    decay: {}
                }
            },
            spotLightShadows: {
                value: [],
                properties: {
                    shadowBias: {},
                    shadowNormalBias: {},
                    shadowRadius: {},
                    shadowMapSize: {}
                }
            },
            spotShadowMap: { value: [] },
            spotShadowMatrix: { value: [] },
            pointLights: {
                value: [],
                properties: {
                    color: {},
                    position: {},
                    decay: {},
                    distance: {}
                }
            },
            pointLightShadows: {
                value: [],
                properties: {
                    shadowBias: {},
                    shadowNormalBias: {},
                    shadowRadius: {},
                    shadowMapSize: {},
                    shadowCameraNear: {},
                    shadowCameraFar: {}
                }
            },
            pointShadowMap: { value: [] },
            pointShadowMatrix: { value: [] },
            hemisphereLights: {
                value: [],
                properties: {
                    direction: {},
                    skyColor: {},
                    groundColor: {}
                }
            },
            rectAreaLights: {
                value: [],
                properties: {
                    color: {},
                    position: {},
                    width: {},
                    height: {}
                }
            },
            ltc_1: { value: null },
            ltc_2: { value: null }
        };
    }
}