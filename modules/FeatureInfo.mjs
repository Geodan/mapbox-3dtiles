import * as THREE from 'three';

import { GetIntersectingObjects } from './Utils.mjs'
import { internalGLTFCache } from './TileLoaders.mjs';
import TilesetLayer from './TilesetLayer.mjs';

export default class FeatureInfo {
    constructor(world, map, camera, loader) {
        this.world = world;
        this.map = map;
        this.camera = camera;
        this.loader = loader;
        this.selectedObjects = [];
        this._createSelectMaterial();
    }

    getAt(result, x, y) {
        this.unselect();

        const intersects = GetIntersectingObjects(this.camera, this.world.children, this.map.transform.width, this.map.transform.height, x, y);

        if (!intersects || intersects.length == 0 || !intersects[0].object) {
            return result;
        }

        const intersect = intersects[0];
        const type = intersect.object.modelType;
        const feature = this._createFeature(type, intersect);
        this._selectObject(type, intersect);
        result.unshift(feature);
        this.map.triggerRepaint();

        return result;
    }

    unselect() {
        for (let i = 0; i < this.selectedObjects.length; i++) {
            const selected = this.selectedObjects[i];
            selected.parent.remove(selected.object);
        }

        this.selectedObjects = [];
        this._updateMap();
    }

    _createSelectMaterial() {
        this.selectMaterial = new THREE.MeshBasicMaterial({
            color: 0xA63744,
            side: THREE.FrontSide,
            transparent: true,
            depthTest: true,
            opacity: 0.7
        });

        this.selectMaterial.polygonOffset = true;
        this.selectMaterial.polygonOffsetUnit = 1;
        this.selectMaterial.polygonOffsetFactor = -5;
    }

    _updateMap() {
        this.map.triggerRepaint();
    }

    _getTilesetID(o) {
        if (o instanceof TilesetLayer) {
            return o.tilesetId;
        } else if (o.parent) {
            return this._getTilesetID(o.parent);
        } else {
            return undefined;
        }
    }

    async _selectObject(type, intersect) {
        let selectedObject = {};

        switch (type) {
            case "i3dm":
                selectedObject = await this._createSelectI3dm(intersect);
                break;
            case "b3dm":
                selectedObject = this._createSelectB3dm(intersect);
                break;
        }

        intersect.object.parent.add(selectedObject);

        this.selectedObjects.push({
            parent: intersect.object.parent,
            object: selectedObject
        })

        this._updateMap();
    }

    _createFeature(type, intersect) {
        let feature = {
            type: 'Feature',
            properties: {},
            geometry: {},
            layer: { id: "", type: 'custom 3d' },
            source: this.url,
            'source-layer': null,
            state: {}
        };

        const tilesetId = this._getTilesetID(intersect.object);
        feature.layer.id = tilesetId;

        switch (type) {
            case "i3dm":
                return this._createFeatureI3DM(feature, intersect);
            case "b3dm":
                return this._createFeatureB3DM(feature, intersect);
        }

        return feature;
    }

    _createFeatureI3DM(feature, intersect) {
        let keys = Object.keys(intersect.object.userData);
        if (keys.length) {
            for (let propertyName of keys) {
                feature.properties[propertyName] = intersect.object.userData[propertyName][intersect.instanceId];
            }
        } else {
            feature.properties.batchId = intersect.instanceId;
        }

        return feature;
    }

    _createFeatureB3DM(feature, intersect) {
        if (intersect.object.userData.b3dm) {
            feature.properties['b3dm'] = intersect.object.userData.b3dm;
        }

        let keys = Object.keys(intersect.object.userData);
        if (keys.length) {
            for (let propertyName of keys) {
                feature.properties[propertyName] = intersect.object.userData[propertyName][intersect.instanceId];
            }
        } else {
            feature.properties.batchId = intersect.instanceId;
        }

        const vertexIdx = intersect.face.a;
        const propertyIndex = intersect.object.geometry.attributes._batchid.getX(vertexIdx);
        feature.properties.batchId = propertyIndex;
        let parentKeys = Object.keys(intersect.object.parent.userData);
        if (parentKeys.length) {
            for (let propertyName of parentKeys) {
                feature.properties[propertyName] =
                    intersect.object.parent.userData[propertyName][propertyIndex];
            }
        }

        return feature;
    }

    _createSelectB3dm(intersect) {
        let vertexIdx = intersect.face.a;

        const colors = [];
        const normals = [];
        const positions = [];
        const object = intersect.object;
        const count = object.geometry.attributes.position.count;
        const batchId = object.geometry.attributes._batchid.getX(vertexIdx);

        let start = undefined;
        let end = undefined;

        // find start and end index for object with batchId
        for (let i = 0; i < count; i++) {
            if (object.geometry.attributes._batchid.getX(i) === batchId) {
                if (start === undefined) {
                    start = i;
                }
            } else if (start !== undefined && end === undefined) {
                end = i--;
            }
        }

        // loop trough indices and get attributes when indice value is inside batch attribute range
        for (let i = 0; i < object.geometry.index.count; i++) {
            const val = object.geometry.index.array[i];

            if (val >= start && val <= end) {
                colors.push(object.geometry.attributes.color.getX(val));
                colors.push(object.geometry.attributes.color.getY(val));
                colors.push(object.geometry.attributes.color.getZ(val));

                normals.push(object.geometry.attributes.normal.getX(val));
                normals.push(object.geometry.attributes.normal.getY(val));
                normals.push(object.geometry.attributes.normal.getZ(val));

                positions.push(object.geometry.attributes.position.getX(val));
                positions.push(object.geometry.attributes.position.getY(val));
                positions.push(object.geometry.attributes.position.getZ(val));
            }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3, false));
        geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3, false));
        geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3, false));

        return new THREE.Mesh(geometry, this.selectMaterial);
    }

    _createSelectI3dm(intersect) {
        return new Promise((resolve, reject) => {
            const instanceId = intersect.instanceId;
            const objectMatrix = new THREE.Matrix4();
            intersect.object.getMatrixAt(instanceId, objectMatrix);

            const cache = internalGLTFCache;
            var glbData = cache.get(intersect.object.model);

            let selectScene = undefined;
            const resource = intersect.object.model;

            this.loader.parse(glbData, resource, (gltf) => {
                selectScene = gltf.scene || gltf.scenes[0];
                selectScene.rotateX(Math.PI / 2); // convert from GLTF Y-up to Mapbox Z-up
                selectScene.matrixWorldNeedsUpdate = false;
                selectScene.applyMatrix4(objectMatrix);
                selectScene.updateMatrixWorld();
                selectScene.traverse(child => {
                    if (child instanceof THREE.Mesh) {
                        child.material = this.selectMaterial;
                    }
                });

                selectScene.needsUpdate = true;
                resolve(selectScene);
            });
        });
    }
}
