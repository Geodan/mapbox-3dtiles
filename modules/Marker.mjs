import * as THREE from 'three';
import { SVGRenderer, SVGObject } from 'three/examples/jsm/renderers/SVGRenderer.js';
//import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { GetModel } from './Utils.mjs';

export default class Marker {
    constructor(scene, map) {
        this.scene = scene;
        this.map = map;
        this.items = [];
    }

    add(modelId, svg, scale = 1.0, offset = { x: 0, y: 0, z: 0 }, onclickListener) {
        if (!modelId || this._hasMarker(modelId)) {
            return;
        }

        const item = this._addMarkerAboveModel(modelId, svg, (scale = 1.0), (offset = { x: 0, y: 0, z: 0 }), onclickListener);
        if (!item) {
            return;
        }

        this._addToItems(item);
        this.map.triggerRepaint();
    }

    remove(modelId) {
        const item = this._getItem(modelId);
        if (!item) {
            return;
        }

        document.body.removeChild(item.renderer.domElement);
        item.model.remove(item.marker);
        this._removeFromItems(modelId);
    }

    clear() {
        this.items.forEach((e) => {
            this.remove(e.modelId);
        });

        this.items = [];
    }

    getMarkers() {
        return this.items;
    }

    _createRenderer() {
        const svgRenderer = new SVGRenderer();
        svgRenderer.setSize(window.innerWidth, window.innerHeight);
        svgRenderer.setQuality('low');
        document.body.appendChild(svgRenderer.domElement);
        window.addEventListener('resize', () => {
            svgRenderer.setSize(window.innerWidth, window.innerHeight);
        });

        return svgRenderer;
    }

    _addMarkerAboveModel(modelId, svg, scale = 1.0, offset = { x: 0, y: 0, z: 0 }, onclickListener) {
        const model = GetModel(modelId, this.scene.children);
        if (!model) {
            return;
        }

        let marker = {};
        const renderer = this._createRenderer();
        const svgScene = new THREE.Scene();
        const loader = new THREE.FileLoader();
        const box = new THREE.Box3().setFromObject(model);
        box.min = model.worldToLocal(box.min);
        box.max = model.worldToLocal(box.max);
        const center = new THREE.Vector3((box.max.x - box.min.x) * 0.5, box.min.y, (box.min.z - box.max.z) * 0.5);

        loader.load(svg, (data) => {
            const node = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            const parser = new DOMParser();
            const doc = parser.parseFromString(data, 'image/svg+xml');

            node.appendChild(doc.documentElement);
            if (onclickListener) {
                node.firstChild.addEventListener('mousedown', onclickListener.bind(this));
                node.firstChild.onmouseover = () => {
                    node.firstChild.style = 'cursor: pointer;';
                };
                node.firstChild.onmouseout = () => {
                    node.firstChild.style = 'cursor: unset;';
                };
            }

            marker = new SVGObject(node);
            marker.applyMatrix4(new THREE.Matrix4().makeScale(scale, scale, scale));
            marker.position.x = center.x + offset.x;
            marker.position.y = box.max.y + offset.y;
            marker.position.z = center.z + offset.z;
            svgScene.add(marker);
            model.add(svgScene);
        });

        return {
            modelId: modelId,
            model: model,
            marker: svgScene,
            renderer: renderer
        };
    }

    _addToItems(item) {
        this.items.push(item);
    }

    _removeFromItems(modelId) {
        this.items = this.items.filter((e) => {
            return e.modelId !== modelId;
        });
    }

    _hasMarker(modelId) {
        return this._getItem(modelId) !== undefined;
    }

    _getItem(modelId) {
        for (let i = 0; i < this.items.length; i++) {
            if (this.items[i].modelId === modelId) {
                return this.items[i];
            }
        }
    }
}
