import * as THREE from '../node_modules/three/build/three.module.js';
import { Line2 } from '../node_modules/three/examples/jsm/lines/Line2.js';
import { LineMaterial } from '../node_modules/three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from '../node_modules/three/examples/jsm/lines/LineGeometry.js';
import { GetModel } from './Utils.mjs';

export default class Highlight {
    constructor(scene, map) {
        this.scene = scene;
        this.map = map;
        this.items = [];
    }

    add(modelId, color, gradientColor, boxMargin) {
        if (this._isHighlighted(modelId)) {
            return;
        }

        const item = this._createHighlight(modelId, this.scene, color, gradientColor, boxMargin);
        if (!item) {
            return;
        }

        const model = item.model;
        model.add(item.highlight);

        this._addToItems(item);
        this.map.triggerRepaint();
    }

    remove(modelId) {
        const highlighted = this._getHighlighted(modelId);
        if (!highlighted) {
            return;
        }

        highlighted.model.remove(highlighted.highlight);
        this._removeFromItems(modelId);
    }

    clear() {
        this.items.forEach((e) => {
            this.remove(e.modelId);
        });

        this.items = [];
    }

    _addToItems(item) {
        this.items.push(item);
    }

    _removeFromItems(modelId) {
        this.items = this.items.filter((e) => {
            return e.modelId !== modelId;
        });
    }

    _isHighlighted(modelId) {
        return this._getHighlighted(modelId) !== undefined;
    }

    _getHighlighted(modelId) {
        for (let i = 0; i < this.items.length; i++) {
            if (this.items[i].modelId === modelId) {
                return this.items[i];
            }
        }
    }

    _createHighlight(modelId, color, gradientColor, boxMargin) {
        color = color ? color : '#1C5A6D';
        gradientColor = gradientColor ? gradientColor : '#ffff00';
        boxMargin = boxMargin ? boxMargin : 0.05;

        const model = GetModel(modelId, this.scene.children);
        if (!model) {
            return;
        }

        const box = new THREE.Box3().setFromObject(model);
        box.min = model.worldToLocal(box.min);
        box.max = model.worldToLocal(box.max);

        const xAdd = boxMargin * box.max.x - boxMargin * box.min.x;
        const yAdd = boxMargin * box.max.y - boxMargin * box.min.y;
        const zAdd = boxMargin * box.max.z - boxMargin * box.min.z;

        const vertices = [
            [box.min.x - xAdd, box.min.y - yAdd, box.min.z - zAdd],
            [box.min.x - xAdd, box.max.y + yAdd, box.min.z - zAdd],
            [box.max.x + xAdd, box.max.y + yAdd, box.min.z - zAdd],
            [box.max.x + xAdd, box.min.y - yAdd, box.min.z - zAdd],
            [box.min.x - xAdd, box.min.y - yAdd, box.max.z + zAdd],
            [box.min.x - xAdd, box.max.y + yAdd, box.max.z + zAdd],
            [box.max.x + xAdd, box.max.y + yAdd, box.max.z + zAdd],
            [box.max.x + xAdd, box.min.y - yAdd, box.max.z + zAdd]
        ];

        const planes = [
            this._createPlane([vertices[1], vertices[2], vertices[0], vertices[3]], color, gradientColor, 'back'),
            this._createPlane([vertices[2], vertices[6], vertices[3], vertices[7]], color, gradientColor, 'back'),
            this._createPlane([vertices[1], vertices[5], vertices[0], vertices[4]], color, gradientColor, 'back'),
            this._createPlane([vertices[5], vertices[6], vertices[4], vertices[7]], color, gradientColor, 'back'),
            this._createPlane([vertices[1], vertices[2], vertices[0], vertices[3]], color, gradientColor, 'front'),
            this._createPlane([vertices[2], vertices[6], vertices[3], vertices[7]], color, gradientColor, 'front'),
            this._createPlane([vertices[1], vertices[5], vertices[0], vertices[4]], color, gradientColor, 'front'),
            this._createPlane([vertices[5], vertices[6], vertices[4], vertices[7]], color, gradientColor, 'front')
        ];

        const line = this._createLine(
            [...vertices[1], ...vertices[2], ...vertices[6], ...vertices[5], ...vertices[1]],
            gradientColor || color
        );

        const highlight = new THREE.Group();
        highlight.add(...planes);
        highlight.add(line);

        return {
            modelId: modelId,
            model: model,
            highlight: highlight
        };
    }

    _createPlane(vertices, color, gradientColor, side = 'front') {
        const bufferGeom = new THREE.BufferGeometry();
        bufferGeom.setAttribute(
            'position',
            new THREE.BufferAttribute(
                new Float32Array([...vertices[0], ...vertices[1], ...vertices[2], ...vertices[3]]),
                3
            )
        );

        bufferGeom.setIndex([0, 2, 1, 2, 3, 1]);
        bufferGeom.computeVertexNormals();
        bufferGeom.computeBoundingBox();

        const geom = new THREE.Geometry().fromBufferGeometry(bufferGeom);
        geom.faceVertexUvs = new THREE.PlaneGeometry().faceVertexUvs;
        geom.uvsNeedUpdate = true;

        const material = new THREE.MeshLambertMaterial({
            color: color || '#1C5A6D',
            transparent: true,
            opacity: 0.4,
            side: side === 'back' ? THREE.BackSide : THREE.FrontSide
        });
        material.defines = { USE_UV: '' };
        material.onBeforeCompile = (shader) => {
            shader.uniforms.gradientColor = {
                value: new THREE.Color(gradientColor || '#ffff00')
            };
            shader.fragmentShader = `
        uniform vec3 gradientColor;
        ${shader.fragmentShader.replace(
            'vec4 diffuseColor = vec4( diffuse, opacity );',
            'vec4 diffuseColor = vec4( mix(diffuse, gradientColor, vec3(vUv.y)), opacity);'
        )}`;
        };

        const plane = new THREE.Mesh(geom, material);
        return plane;
    }

    _createLine(positions, color) {
        const geometry = new LineGeometry();
        geometry.setPositions(positions);

        const matLine = new LineMaterial({
            color,
            linewidth: 0.002,
            dashed: false
        });

        const line = new Line2(geometry, matLine);
        return line;
    }
}
