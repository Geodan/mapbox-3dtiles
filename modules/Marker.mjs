import * as THREE from '../node_modules/three/build/three.module.js';
import { SVGRenderer, SVGObject } from '../node_modules/three/examples/jsm/renderers/SVGRenderer.js';
//import { CSS2DRenderer, CSS2DObject } from '../node_modules/three/examples/jsm/renderers/CSS2DRenderer.js';
import { GetModel } from './Utils.mjs';

export default class Marker {
    constructor(scene, map) {
        this.scene = scene;
        this.map = map;
        this.items = [];
    }

    add(modelId, svg, scale = 1.0, offset = { x: 0, y: 0, z: 0 }, onclickListener) {
        if (this._hasMarker(modelId)) {
            return;
        }

        const item = this._addMarkerAboveModel(modelId, svg, (scale = 1.0), (offset = { x: 0, y: 0, z: 0 }));
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

        item.model.remove(item.marker);
        this._removeFromItems(modelId);
    }

    clear() {
        this.items.forEach((e) => {
            this.remove(e.modelId);
        });

        this.items = [];
    }

    getRenderer() {
        return this._svgRenderer;
    }

    getScenes() {
        const scenes = [];
        for(let i = 0; i < this.items.length; i++) {
            scenes.push(this.items[i].marker);
        }

        return scenes;
    }

    _createRenderer() {
        if (!this._svgRenderer) {
            this._svgRenderer = new SVGRenderer();
            this._svgRenderer.setSize(window.innerWidth, window.innerHeight);
            this._svgRenderer.setQuality('low');
            document.body.appendChild(this._svgRenderer.domElement);
            window.addEventListener('resize', () => {
                this._svgRenderer.setSize(window.innerWidth, window.innerHeight);
            });
        }
    }

    _addMarkerAboveModel(modelId, svg, scale = 1.0, offset = { x: 0, y: 0, z: 0 }, onclickListener) {
        const model = GetModel(modelId, this.scene.children);
        if (!model) {
            return;
        }

        this._createRenderer();
        let marker = {};
        const svgScene = new THREE.Scene();
        const loader = new THREE.FileLoader();
        const box = new THREE.Box3().setFromObject(model);
        box.min = model.worldToLocal(box.min);
        box.max = model.worldToLocal(box.max);
        const center = new THREE.Vector3((box.max.x - box.min.x) * 0.5, box.min.y, (box.min.z - box.max.z) * 0.5);

        loader.load(svg, (data) => {
            this._SvgNode = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            const parser = new DOMParser();
            const doc = parser.parseFromString(data, 'image/svg+xml');

            this._SvgNode.appendChild(doc.documentElement);
            if (onclickListener) {
                this._SvgNode.firstChild.addEventListener('click', onclickListener.bind(this));
                this._SvgNode.firstChild.onmouseover = () => {
                    this._SvgNode.firstChild.style = 'cursor: pointer;';
                };
                this._SvgNode.firstChild.onmouseout = () => {
                    this._SvgNode.firstChild.style = 'cursor: unset;';
                };
            }

            marker = new SVGObject(this._SvgNode);
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
            marker: svgScene
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
