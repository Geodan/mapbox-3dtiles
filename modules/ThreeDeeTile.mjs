import * as THREE from 'three';

import { DEBUG } from "./Constants.mjs"
import { DebugColors, CreateDebugLabel, CreateDebugBox, CreateDebugLine } from "./Debugging.mjs"
import { PNTS, B3DM, CMPT } from "./TileLoaders.mjs"
import { IMesh } from "./InstancedMesh.mjs"
import { LatToScale, YToLat } from "./Utils.mjs"
import Tileset from './Tileset.mjs';
import applyStyle from './Styler.mjs'

export default class ThreeDeeTile {
  constructor(json, resourcePath, styleParams, updateCallback, renderCallback, parentRefine, parentTransform, projectToMercator, loader) {
    this.loaded = false;
    this.styleParams = styleParams;
    this.updateCallback = updateCallback;
    this.renderCallback = renderCallback;
    this.resourcePath = resourcePath;
    this.projectToMercator = projectToMercator;
    this.loader = loader;
    this.totalContent = new THREE.Group();  // Three JS Object3D Group for this tile and all its children
    this.tileContent = new THREE.Group();    // Three JS Object3D Group for this tile's content
    this.childContent = new THREE.Group();    // Three JS Object3D Group for this tile's children
    this.totalContent.add(this.tileContent);
    this.totalContent.add(this.childContent);
    this.boundingVolume = json.boundingVolume;

    if (this.boundingVolume && this.boundingVolume.box) {
      let b = this.boundingVolume.box;
      let extent = [b[0] - b[3], b[1] - b[7], b[0] + b[3], b[1] + b[7]];
      let sw = new THREE.Vector3(extent[0], extent[1], b[2] - b[11]);
      let ne = new THREE.Vector3(extent[2], extent[3], b[2] + b[11]);
      this.box = new THREE.Box3(sw, ne);
    } else {
      this.extent = null;
      this.sw = null;
      this.ne = null;
      this.box = null;
      this.center = null;
    }

    this.refine = json.refine ? json.refine.toUpperCase() : parentRefine;
    this.geometricError = json.geometricError;
    this.worldTransform = parentTransform ? parentTransform.clone() : new THREE.Matrix4();
    this.transform = json.transform;

    if (this.transform) {
      let tileMatrix = new THREE.Matrix4().fromArray(this.transform);
      this.totalContent.applyMatrix4(tileMatrix);
      this.worldTransform.multiply(tileMatrix);
    }

    this.content = json.content;
    this.children = [];

    if (json.children) {
      for (let i = 0; i < json.children.length; i++) {
        let child = new ThreeDeeTile(json.children[i], resourcePath, this.styleParams, updateCallback, renderCallback, this.refine, this.worldTransform, this.projectToMercator, this.loader);
        this.childContent.add(child.totalContent);
        this.children.push(child);
      }
    }
  }

  //ThreeDeeTile.load
  async load() {
    if (this.loaded) {
      return this.loaded;
    }

    if (this.loading) {
      return this.loaded;
    }

    this.loading = true;

    if (this.content) {
      let url = this.content.uri ? this.content.uri : this.content.url;

      if (!url) {
        this.loading = false;
        this.loaded = true;
        return this.loaded;
      }

      if (url.substr(0, 4) != 'http') {
        url = this.resourcePath + url;
      }

      let type = url.slice(-4);
      switch (type) {
        case 'json':
          // child is a tileset json
          this.isParentTileset = true;
          this.originalBox = this.box.clone();
          this.originalWorldTransform = this.worldTransform.clone();

          try {
            let subTileset = new Tileset((ts) => this.updateCallback(ts), () => this.renderCallback(), this.loader);
            await subTileset.load(url, this.styleParams);
            //console.log(`loaded json from url ${url}`);
            if (subTileset.root) {
              this.children.push(subTileset.root);
              subTileset.root.box.applyMatrix4(this.worldTransform);
              this.childContent.add(subTileset.root.totalContent);
              // Threejs > 119
              //let inverseMatrix = new THREE.Matrix4();
              //inverseMatrix.copy(this.worldTransform).invert();
              // Threejs < 120
              let inverseMatrix = new THREE.Matrix4().getInverse(this.worldTransform);
              subTileset.root.totalContent.applyMatrix4(inverseMatrix);
              subTileset.root.totalContent.updateMatrixWorld();
              await subTileset.root.checkLoad(this.frustum, this.cameraPosition, subTileset.geometricError);
            }
          } catch (error) {
            // load failed (wrong url? connection issues?)
            // log error, do not break program flow
            console.error(error);
          }
          break;
        case 'b3dm':
          try {
            this.tileLoader = new B3DM(url);
            let b3dmData = await this.tileLoader.load();
            this.tileLoader = null;
            this.b3dmAdd(b3dmData, url);
          } catch (error) {
            if (error.name === "AbortError") {
              //console.log(`cancelled ${url}`)
              this.loading = false;
              this.loaded = false;
              return this.loaded;
            }

            console.error(error);
          }
          break;
        case 'i3dm':
          try {
            this.tileLoader = new B3DM(url);
            let i3dmData = await this.tileLoader.load();
            this.tileLoader = null;
            this.i3dmAdd(i3dmData);
          } catch (error) {
            if (error.name === "AbortError") {
              this.loading = false;
              this.loaded = false;
              return this.loaded;
            }

            console.error(error.message);
          }
          break;
        case 'pnts':
          try {
            this.tileLoader = new PNTS(url);
            let pointData = await this.tileLoader.load();
            this.tileLoader = null;
            this.pntsAdd(pointData);
          } catch (error) {
            if (error.name === "AbortError") {
              this.loading = false;
              this.loaded = false;
              return this.loaded;
            }

            console.error(error);
          }
          break;
        case 'cmpt':
          try {
            this.tileLoader = new CMPT(url);
            let compositeTiles = await this.tileLoader.load();
            this.tileLoader = null;
            this.cmptAdd(compositeTiles, url);
          } catch (error) {
            if (error.name === "AbortError") {
              this.loading = false;
              this.loaded = false;
              return this.loaded;
            }

            console.error(error);
          }
          break;
        default:
          throw new Error('invalid tile type: ' + type);
      }
    }

    this.loading = false;
    this.loaded = true;
    this.updateCallback(this);

    return this.loaded;
  }

  async cmptAdd(compositeTiles, url) {
    if (this.cmptAdded) {
      // prevent duplicate adding
      return;
    }

    this.cmptAdded = true;
    for (let innerTile of compositeTiles) {
      switch (innerTile.type) {
        case 'i3dm':
          let i3dm = new B3DM('.i3dm');
          let i3dmData = await i3dm.parseResponse(innerTile.data);
          this.i3dmAdd(i3dmData);
          break;
        case 'b3dm':
          let b3dm = new B3DM('.b3dm');
          let b3dmData = await b3dm.parseResponse(innerTile.data);
          this.b3dmAdd(b3dmData, url.slice(0, -4) + 'b3dm');
          break;
        case 'pnts':
          let pnts = new PNTS('.pnts');
          let pointData = pnts.parseResponse(innerTile.data);
          this.pntsAdd(pointData);
          break;
        case 'cmpt':
          let cmpt = new CMPT('.cmpt');
          let subCompositeTiles = cmpt.parseResponse(innerTile.data);
          this.cmptAdd(subCompositeTiles);
          break;
        default:
          console.error(`Composite type ${innerTile.type} not supported`);
          break;
      }
      //console.log(`type: ${innerTile.type}, size: ${innerTile.data.byteLength}`);
    }
  }

  pntsAdd(pointData) {
    if (this.pntsAdded && !this.cmptAdded) {
      // prevent duplicate adding
      return;
    }

    this.pntsAdded = true;
    let geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(pointData.points, 3));
    let material = new THREE.PointsMaterial();
    material.size = this.styleParams.pointsize != null ? this.styleParams.pointsize : 1.0;
    if (this.styleParams.color) {
      material.vertexColors = THREE.NoColors;
      material.color = new THREE.Color(this.styleParams.color);
      material.opacity = this.styleParams.opacity != null ? this.styleParams.opacity : 1.0;
    } else if (pointData.rgba) {
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(pointData.rgba, 4));
      material.vertexColors = THREE.VertexColors;
    } else if (pointData.rgb) {
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(pointData.rgb, 3));
      material.vertexColors = THREE.VertexColors;
    }

    this.tileContent.add(new THREE.Points(geometry, material));

    if (pointData.rtc_center) {
      let c = pointData.rtc_center;
      this.tileContent.applyMatrix4(new THREE.Matrix4().makeTranslation(c[0], c[1], c[2]));
    }

    this.tileContent.add(new THREE.Points(geometry, material));
    this.renderCallback(this);
  }

  b3dmAdd(b3dmData, url) {
    if (this.b3dmAdded && !this.cmptAdded) {
      // prevent duplicate adding
      return;
    }

    this.b3dmAdded = true;

    this.loader.parse(
      b3dmData.glbData,
      this.resourcePath,
      (gltf) => {
        let scene = gltf.scene || gltf.scenes[0];
        let rotateX = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(1, 0, 0), Math.PI / 2);
        scene.applyMatrix4(rotateX); // convert from GLTF Y-up to Z-up

        //Add the batchtable to the userData since gltfLoader doesn't deal with it
        scene.userData = b3dmData.batchTableJson;
        scene.userData.b3dm = url.replace(this.resourcePath, '').replace('.b3dm', '');

        if (scene.userData && Array.isArray(b3dmData.batchTableJson.attr)) {
          scene.userData.attr = scene.userData.attr.map((d) => d.split(','));
        }

        if (this.projectToMercator) {
          //TODO: must be a nicer way to get the local Y in webmerc. than worldTransform.elements	
          scene.scale.setScalar(LatToScale(YToLat(this.worldTransform.elements[13])));
        }

        scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.stylable = true;
            child.castShadow = true;
            child.userData = scene.userData;
            child.modelType = "b3dm";
            //FIXME: TT: this seems like temporary code
            if (this.styleParams && Object.keys(this.styleParams).length > 0) {
              child.material = new THREE.MeshStandardMaterial({
                color: '#ffffff'
              });
            }
          }
        });

        if (this.styleParams && Object.keys(this.styleParams).length > 0) {
          scene = applyStyle(scene, this.styleParams);
        }

        // time test
        /*         const geom = scene.children[0].geometry;
                const colors = geom.attributes.color;
                const positions = geom.attributes.position;
                let batchColors = {};
        
                for (let i = 0; i < positions.count; i++) {
                  const batchID = geom.attributes._batchid.getX(i);
        
                  if (!batchColors[batchID]) {
                    batchColors[batchID] = { r: Math.random(), g: Math.random(), b: Math.random() };
                  }
        
                  colors.setX(i, batchColors[batchID].r);
                  colors.setY(i, batchColors[batchID].g);
                  colors.setZ(i, batchColors[batchID].b);
                } */

        this.tileContent.add(scene);
        this.renderCallback(this);
      },
      (error) => {
        throw new Error('error parsing gltf: ' + error);
      }
    );
  }

  i3dmAdd(i3dmData) {
    if (this.i3dmAdded && !this.cmptAdded) {
      // prevent duplicate adding
      return;
    }

    this.i3dmAdded = true;

    // Check what metadata is present in the featuretable, currently using: https://github.com/CesiumGS/3d-tiles/tree/master/specification/TileFormats/Instanced3DModel#instance-orientation.				
    let metadata = i3dmData.featureTableJSON;
    if (!metadata.POSITION) {
      console.error(`i3dm missing position metadata`);
      return;
    }

    let instancesParams = {
      positions: new Float32Array(i3dmData.featureTableBinary, metadata.POSITION.byteOffset, metadata.INSTANCES_LENGTH * 3)
    }

    if (metadata.RTC_CENTER) {
      if (Array.isArray(metadata.RTC_CENTER) && metadata.RTC_CENTER.length === 3) {
        instancesParams.rtcCenter = [metadata.RTC_CENTER[0], metadata.RTC_CENTER[1], metadata.RTC_CENTER[2]];
      }
    }

    if (metadata.NORMAL_UP && metadata.NORMAL_RIGHT) {
      instancesParams.normalsRight = new Float32Array(i3dmData.featureTableBinary, metadata.NORMAL_RIGHT.byteOffset, metadata.INSTANCES_LENGTH * 3);
      instancesParams.normalsUp = new Float32Array(i3dmData.featureTableBinary, metadata.NORMAL_UP.byteOffset, metadata.INSTANCES_LENGTH * 3);
    }

    if (metadata.SCALE) {
      instancesParams.scales = new Float32Array(i3dmData.featureTableBinary, metadata.SCALE.byteOffset, metadata.INSTANCES_LENGTH);
    }

    if (metadata.SCALE_NON_UNIFORM) {
      instancesParams.xyzScales = new Float32Array(i3dmData.featureTableBinary, metadata.SCALE_NON_UNIFORM.byteOffset, metadata.INSTANCES_LENGTH);
    }

    // Threejs > 119
    //let inverseMatrix = new THREE.Matrix4();
    //inverseMatrix.copy(this.worldTransform).invert(); // in order to offset by the tile

    // Threejs < 120
    let inverseMatrix = new THREE.Matrix4().getInverse(this.worldTransform);
    let self = this;

    this.loader.parse(i3dmData.glbData, this.resourcePath, (gltf) => {
      let scene = gltf.scene || gltf.scenes[0];
      scene.rotateX(Math.PI / 2); // convert from GLTF Y-up to Mapbox Z-up
      scene.updateMatrixWorld(true);

      scene.traverse(child => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.userData = i3dmData.batchTableJson;
          IMesh(child, instancesParams, inverseMatrix, i3dmData.modelUrl)
            .then(d => self.tileContent.add(d));
        }
      });
    });

    this.renderCallback(this);
  }

  _hide() {
    if (this.tileContentVisible) {
      this.totalContent.remove(this.tileContent);
      this.tileContentVisible = false;
    }
  }

  _hideChildren() {
    if (this.childContentVisible) {
      this.totalContent.remove(this.childContent);
      this.childContentVisible = false;
    }
  }

  _show() {
    if (!this.tileContentVisible) {
      this.tileContentVisible = true;
      this.totalContent.add(this.tileContent);
    }
  }

  _exposeChildren() {
    if (!this.childContentVisible) {
      this.totalContent.add(this.childContent);
      this.childContentVisible = true;
    }
  }

  _remove(includeChildren) {
    if (includeChildren) {
      for (const child of this.children) {
        child._remove(includeChildren);
      }
    }

    if (this.loading) {
      if (this.tileLoader) {
        this.tileLoader.abortLoad();
      }
      this.loading = false;
    }

    if (!this.loaded) {
      return;
    }

    this.loaded = false;
    this.unloadedTileContent = true;
    this.totalContent.remove(this.tileContent);
    this.freeObjectFromMemory(this.tileContent);
    this.tileContent = new THREE.Group();
    this.totalContent.add(this.tileContent);
    this.b3dmAdded = false;
    this.i3dmAdded = false;
    this.cmptAdded = false;

    if (includeChildren) {
      this.unloadedChildContent = true;
      this.totalContent.remove(this.childContent);
      this.freeObjectFromMemory(this.childContent);
      this.totalContent.add(this.childContent); // add empty childContent to totalContent

      if (this.isParentTileset) {
        this.children = [];
        this.isParentTileset = false;
        this.unloadedChildContent = false;
        this.unloadedTileContent = false;
      }
    }

    if (DEBUG) {
      this._removeDebugGroup();
    }
  }

  unload(includeChildren) {
    if (this.tileLoader) {
      //this.tileLoader.abortLoad();
    }

    this._remove(includeChildren);
  }

  hasLoadingChildren(node) {
    if (node.inView && node.children.length) {
      for (const child of node.children) {
        if (child.loading) {
          return true;
        }

        if (this.hasLoadingChildren(child)) {
          return true;
        }
      }
    }

    return false;
  }

  async checkLoad(frustum, cameraPosition, maxGeometricError) {
    this.frustum = frustum;
    this.cameraPosition = cameraPosition;
    let transformedBox = this.box.clone();
    transformedBox.applyMatrix4(this.totalContent.matrixWorld);

    // is this tile inside the view?
    if (!frustum.intersectsBox(transformedBox)) {
      this.inView = false;
      this._hide();
      this._hideChildren();
      this.unload(true);

      return false;
    }

    this.inView = true;
    //console.log(`checkLoad: ${this.content?this.content.uri:this.children.length?`parent of ${this.children[0].content.uri}`:'empty leaf'}`)

    let worldBox = this.box.clone().applyMatrix4(this.worldTransform);
    let dist = worldBox.distanceToPoint(cameraPosition);

    const error = Math.sqrt(dist) * 10;
    const height = Math.abs(cameraPosition.z);
    let mod = height >= 1400 ? 1 : (1400 / (height));

    mod = 1;

    const renderError = error / mod;
    const modMax = maxGeometricError / mod;
    const modLocal = this.geometricError / mod;

    //console.log(`dist: ${dist}, renderError: ${renderError}`);
    if (renderError > modMax) {
      // tile too far
      this._hide();
      this._hideChildren();
    } else if (renderError > modLocal) {
      // tile in range
      this.load();

      if (this.loading) {
        return;
      }

      this._show();
      // update children for range
      for (const child of this.children) {
        if (child.geometricError < modLocal) {
          child.checkLoad(frustum, cameraPosition, this.geometricError);
        } else {
          child.checkLoad(frustum, cameraPosition, maxGeometricError);
        }
      }

      this._exposeChildren();
    } else if (renderError <= modLocal) {
      this._exposeChildren();

      for (let child of this.children) {
        if (this.refine === 'REPLACE') {
          // show all immediate children, including those that are further away due to oblique viewing
          await child.checkLoad(frustum, cameraPosition, maxGeometricError);
        } else {
          // add children depending on viewing distance
          if (child.geometricError < modLocal) {
            await child.checkLoad(frustum, cameraPosition, this.geometricError);
          } else {
            await child.checkLoad(frustum, cameraPosition, maxGeometricError);
          }
        }
      }
      if (this.refine === 'REPLACE' && modLocal > 0) {
        if (!this.hasLoadingChildren(this)) {
          this._hide();
        }
      } else {
        this.load();
        this._show();
      }
    }

    if (DEBUG) {
      this._updateDebugGroup(renderError);
    }

    return true;
  }

  disposeObject(obj) {
    if (obj.material && obj.material.dispose) {
      obj.material.dispose();

      if (obj.material.map) {
        obj.material.map.dispose();
      }
    }

    if (obj.geometry && obj.geometry.dispose) {
      obj.geometry.attributes.color = {};
      obj.geometry.attributes.normal = {};
      obj.geometry.attributes.position = {};
      obj.geometry.attributes.uv = {};
      obj.geometry.attributes._batchid = {};
      obj.geometry.attributes = {};
      obj.geometry.dispose();
      obj.material = {};
    }
  }

  freeObjectFromMemory(object) {
    object.traverse(obj => {
      this.disposeObject(obj);
    });
    this.disposeObject(object);
  }

  _updateDebugGroup(distance) {
    if (!this.tileContentVisible) {
      this._removeDebugGroup();
      return;
    } else {
      this._addDebugGroup();
    }

    const debugColor = this._getDebugColor();
    const volumeBox = this.boundingVolume.box;
    const translation = new THREE.Matrix4().makeTranslation(volumeBox[0], volumeBox[1], volumeBox[2]);

    if (!this.debugGroup) {
      const box = CreateDebugBox(translation, volumeBox, debugColor);
      const line = CreateDebugLine(translation, debugColor);
      this.debugGroup = new THREE.Scene();
      this.debugGroup.add(box);
      this.debugGroup.add(line);
    }

    this.debugGroup.remove(this.sprite);
    const tileTitle = this._getTileTitle();
    const msg = "  " + tileTitle + " - " + distance.toFixed(0) + "  ";
    this.sprite = CreateDebugLabel(translation, volumeBox[11], distance, msg, debugColor);
    this.debugGroup.add(this.sprite);
    this.renderCallback(this);
  }

  _getTileTitle() {
    let title = "";
    if (this.content) {
      title = this.content.uri ? this.content.uri : this.content.url;
      title = title.split('/')[1];
    }

    return title;
  }

  _getDebugColor() {
    const parents = this._getParentCount(this.totalContent);
    return DebugColors[parents];
  }

  _getParentCount(o, count = 0) {
    if (o.parent) {
      count++;
      return this._getParentCount(o.parent, count);
    }

    return count;
  }

  _addDebugGroup() {
    if (this.debugGroup && !this.debugAdded) {
      this.debugAdded = true;
      this.totalContent.add(this.debugGroup);
    }
  }

  _removeDebugGroup() {
    if (this.debugGroup && this.debugAdded) {
      this.totalContent.remove(this.debugGroup);
      this.debugAdded = false;
    }
  }
}
