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

        const item = this._addMarkerAboveModel(modelId, svg, scale = 1.0, offset = { x: 0, y: 0, z: 0 });
        if (!item) {
            return;
        }

        //const model = item.model;
        //model.add(item.highlight);

        //this._addToItems(item);
        this.map.triggerRepaint();
    }

    remove(modelId) {
        const highlighted = this._hasMarker(modelId);
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

    getRenderer() {
        return this._svgRenderer;
    }

    getScene() {
        return this._svgScene;
    }

    _addMarkerAboveModel(modelId, svg, scale = 1.0, offset = { x: 0, y: 0, z: 0 }, onclickListener) {
        const model = GetModel(modelId, this.scene.children);
        if (!model) {
            return;
        }

        if (!this._svgRenderer) {
            this._svgRenderer = new SVGRenderer();
            this._svgRenderer.setSize(window.innerWidth, window.innerHeight);
            this._svgRenderer.setQuality('low');
            document.body.appendChild(this._svgRenderer.domElement);
            window.addEventListener('resize', () => {
                this._svgRenderer.setSize(window.innerWidth, window.innerHeight);
            });
            this._svgScene = new THREE.Scene();
        }

            const loader = new THREE.FileLoader();
            const box = new THREE.Box3().setFromObject(model);
            box.min = model.worldToLocal(box.min);
            box.max = model.worldToLocal(box.max);

            let center = new THREE.Vector3();
            box.getCenter(center);
            
            center = new THREE.Vector3((box.max.x - box.min.x) * 0.5, (box.max.y - box.min.y) * 0.5, (box.min.z - box.max.z) * 0.5);

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

                this._marker = new SVGObject(this._SvgNode);
                this._marker.applyMatrix4(new THREE.Matrix4().makeScale(scale, scale, scale));
                this._marker.position.x = center.x + offset.x;
                this._marker.position.y = box.max.y + offset.y;
                this._marker.position.z = center.z + offset.z;

               // model.add(this._marker);
                this._svgScene.add(this._marker);
                model.add(this._svgScene);
            });
        
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
        return this._getMarked(modelId) !== undefined;
    }

    _getMarked(modelId) {
        for (let i = 0; i < this.items.length; i++) {
            if (this.items[i].modelId === modelId) {
                return this.items[i];
            }
        }
    }
}
