import * as THREE from 'three';
import { MERCATOR_A, WORLD_SIZE, ThreeboxConstants } from './Constants.mjs';
import CameraSync from './CameraSync.mjs';
import TileSet from './TileSet.mjs';
import Highlight from './Highlight.mjs';
import Marker from './Marker.mjs';
import applyStyle from './Styler.mjs'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { SAOPass } from 'three/examples/jsm/postprocessing/SAOPass.js';

export function projectedUnitsPerMeter(latitude) {
    let c = ThreeboxConstants;
    return Math.abs(c.WORLD_SIZE / Math.cos(c.DEG2RAD * latitude) / c.EARTH_CIRCUMFERENCE);
}

export function projectToWorld(coords) {
    // Spherical mercator forward projection, re-scaling to WORLD_SIZE
    let c = ThreeboxConstants;
    var projected = [
        c.MERCATOR_A * c.DEG2RAD * coords[0] * c.PROJECTION_WORLD_SIZE,
        c.MERCATOR_A * Math.log(Math.tan(Math.PI * 0.25 + 0.5 * c.DEG2RAD * coords[1])) * c.PROJECTION_WORLD_SIZE
    ];

    //z dimension, defaulting to 0 if not provided
    if (!coords[2]) {
        projected.push(0);
    } else {
        var pixelsPerMeter = projectedUnitsPerMeter(coords[1]);
        projected.push(coords[2] * pixelsPerMeter);
    }

    var result = new THREE.Vector3(projected[0], projected[1], projected[2]);

    return result;
}

export class Mapbox3DTilesLayer {
    constructor(params) {
        if (!params) throw new Error('parameters missing for mapbox 3D tiles layer');
        if (!params.id) throw new Error('id parameter missing for mapbox 3D tiles layer');
        //if (!params.url) throw new Error('url parameter missing for mapbox 3D tiles layer');

        (this.id = params.id), (this.url = params.url);
        this.styleParams = {};
        this.projectToMercator = params.projectToMercator ? params.projectToMercator : false;
        this.lights = params.lights ? params.lights : this.getDefaultLights();
        if ('color' in params) this.styleParams.color = params.color;
        if ('opacity' in params) this.styleParams.opacity = params.opacity;
        if ('pointsize' in params) this.styleParams.pointsize = params.pointsize;

        this.style = params.style || this.styleParams; //styleparams to be replaced by style config
        this.loadStatus = 0;
        this.viewProjectionMatrix = null;
        this.type = 'custom';
        this.renderingMode = '3d';
    }

    getDefaultLights() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0xbebebe, 0.7);
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
        dirLight.color.setHSL(0.1, 1, 0.95);
        dirLight.position.set(-1, -1.75, 1);
        dirLight.position.multiplyScalar(100);
        dirLight.castShadow = true;
        dirLight.shadow.camera.near = -10000;
        dirLight.shadow.camera.far = 2000000;
        dirLight.shadow.bias = 0.0038;
        dirLight.shadow.mapSize.width = width;
        dirLight.shadow.mapSize.height = height;
        dirLight.shadow.camera.left = -width;
        dirLight.shadow.camera.right = width;
        dirLight.shadow.camera.top = -height;
        dirLight.shadow.camera.bottom = height;

        return [hemiLight, dirLight];
    }

    loadVisibleTiles() {
        if (this.tileset && this.tileset.root) {
            this.tileset.root.checkLoad(this.cameraSync.frustum, this.cameraSync.cameraPosition);
        }
    }

    onAdd(map, gl) {
        window.gl = gl;//FIXME; for debug only
        this.map = map;
        const fov = 36.8;
        const aspect = map.getCanvas().width / map.getCanvas().height;
        const near = 0.000000000001;
        const far = Infinity;
        // create perspective camera, parameters reinitialized by CameraSync
        this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        this.mapQueryRenderedFeatures = map.queryRenderedFeatures.bind(this.map);
        this.map.queryRenderedFeatures = this.queryRenderedFeatures.bind(this);
        this.scene = new THREE.Scene();
        this.rootTransform = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

        this.lights.forEach((light) => {
            this.scene.add(light);
            if (light.shadow && light.shadow.camera) {
                //this.scene.add(new THREE.CameraHelper( light.shadow.camera ));
            }
        });

        this.world = new THREE.Group();
        this.world.name = 'flatMercatorWorld';
        this.scene.add(this.world);

        this.renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
            canvas: map.getCanvas(),
            context: gl
        });

        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowMap;

        this.highlight = new Highlight(this.scene, this.map);
        this.marker = new Marker(this.scene, this.map);

        /* WIP on composer */
        let width = window.innerWidth;
        let height = window.innerHeight;
        this.composer = new EffectComposer(this.renderer);
        
        let ssaoPass = new SSAOPass(this.scene, this.camera, width, height);
        ssaoPass.kernelRadius = 0.1;
        //this.composer.addPass( ssaoPass ); //Renders white screen

        let saoPass = new SAOPass(this.scene, this.camera, false, true);
        saoPass._render = saoPass.render;
        saoPass.render = function (renderer) {
            //renderer.setRenderTarget( _____ )
            renderer.clear();
            this._render.apply(this, arguments);
        };
        //this.composer.addPass( saoPass ); //Renders black screen

        //let renderScene = new RenderPass(this.scene, this.camera);
        //let bloomPass = new UnrealBloomPass(
        //  new THREE.Vector2(window.innerWidth, window.innerHeight),
        //  1.5,
        //  0.4,
        //  0.85
        //);
        //bloomPass.threshold = 0;
        //bloomPass.strength = 1.5;
        //bloomPass.radius = 0;
        //this.composer.addPass( renderScene );
        //this.composer.addPass( bloomPass );

        /* END OF WIP */

        this.renderer.shadowMap.enabled = true;
        this.renderer.autoClear = false;

        this.cameraSync = new CameraSync(this.map, this.camera, this.world);
        this.cameraSync.updateCallback = () => this.loadVisibleTiles();

        //raycaster for mouse events
        this.raycaster = new THREE.Raycaster();
        if (this.url) {
            this.tileset = new TileSet((ts) => {
                if (ts.loaded){ //WIP, poor performance
                    ts.styleParams = this.style;
                    this.map.triggerRepaint();
                }
            });
            this.tileset
                .load(this.url, this.style, this.projectToMercator)
                .then(() => {
                    if (this.tileset.root) {
                        this.world.add(this.tileset.root.totalContent);
                        this.world.updateMatrixWorld();
                        this.loadStatus = 1;
                        this.loadVisibleTiles();
                    }
                })
                .catch((error) => {
                    console.error(`${error} (${this.url})`);
                });
        }

        this.addShadow();
    }

    onRemove(map, gl) {
        // todo: (much) more cleanup?
        this.map.queryRenderedFeatures = this.mapQueryRenderedFeatures;
        this.cameraSync.detachCamera();
        this.cameraSync = null;
    }

    addShadow() {
        //debug plane
        //var geo1 = new THREE.PlaneBufferGeometry(10000, 10000, 1, 1);
        //var mat1 = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, side: THREE.DoubleSide });
        //var plane1 = new THREE.Mesh(geo1, mat1);
        //plane1.receiveShadow = true;
        //this.scene.add(plane1);

        if (!this.shadowPlane) {
            var planeGeometry = new THREE.PlaneBufferGeometry(10000, 10000, 1, 1);
            this.shadowMaterial = new THREE.ShadowMaterial();
            this.shadowMaterial.opacity = 0.3;
            this.shadowPlane = new THREE.Mesh(planeGeometry, this.shadowMaterial);
            this.shadowPlane.receiveShadow = true;
        }

        this.scene.add(this.shadowPlane);
    }

    removeShadow() {
        this.scene.remove(this.shadowPlane);
    }

    setShadowOpacity(opacity) {
        const newOpacity = opacity < 0 ? 0.0 : opacity > 1 ? 1.0 : opacity;
        this.shadowMaterial.opacity = newOpacity;
    }

    setStyle(){//WIP
        //this.style = {
        //    color: 0xff00ff
        //}
        //applyStyle(this.world,this.style);
    }

    //ToDo: currently based on default lights, can be overriden by user, handle differently
    setHismphereIntensity(intensity) {
        if(this.lights[0] instanceof THREE.HemisphereLight) {
            const newIntensity = intensity < 0 ? 0.0 : intensity > 1 ? 1.0 : intensity;
            this.lights[0].intensity = newIntensity;
        }
    }

    queryRenderedFeatures(geometry, options) {
        let result = this.mapQueryRenderedFeatures(geometry, options);
        if (!this.map || !this.map.transform) {
            return result;
        }
        if (!(options && options.layers && !options.layers.includes(this.id))) {
            if (geometry && geometry.x && geometry.y) {
                var mouse = new THREE.Vector2();

                // scale mouse pixel position to a percentage of the screen's width and height
                mouse.x = (geometry.x / this.map.transform.width) * 2 - 1;
                mouse.y = 1 - (geometry.y / this.map.transform.height) * 2;

                this.raycaster.setFromCamera(mouse, this.camera);

                // calculate objects intersecting the picking ray
                let intersects = this.raycaster.intersectObjects(this.world.children, true);
                if (intersects.length) {
                    let feature = {
                        type: 'Feature',
                        properties: {},
                        geometry: {},
                        layer: { id: this.id, type: 'custom 3d' },
                        source: this.url,
                        'source-layer': null,
                        state: {}
                    };
                    let propertyIndex;
                    let intersect = intersects[0];
                    this.previntersect = intersect; //keep to find out if 
                    if (intersect.object.userData.b3dm) {
                        feature.properties['b3dm'] = intersect.object.userData.b3dm;
                    }

                    if (intersect.instanceId) {
                        let keys = Object.keys(intersect.object.userData);
                        if (keys.length) {
                            for (let propertyName of keys) {
                                feature.properties[propertyName] =
                                    intersect.object.userData[propertyName][intersect.instanceId];
                            }
                        } else {
                            feature.properties.batchId = intersect.instanceId;
                        }
                    } else if (
                        intersect.object &&
                        intersect.object.geometry &&
                        intersect.object.geometry.attributes &&
                        intersect.object.geometry.attributes._batchid
                    ) {
                        let geometry = intersect.object.geometry;
                        let vertexIdx = intersect.faceIndex;
                        if (geometry.index) {
                            // indexed BufferGeometry
                            vertexIdx = geometry.index.array[intersect.faceIndex * 3];
                            propertyIndex = geometry.attributes._batchid.data.array[vertexIdx * 7 + 6];
                        } else {
                            // un-indexed BufferGeometry
                            propertyIndex = geometry.attributes._batchid.array[vertexIdx * 3];
                        }
                        let keys = Object.keys(intersect.object.userData);
                        if (keys.length) {
                            for (let propertyName of keys) {
                                feature.properties[propertyName] =
                                    intersect.object.userData[propertyName][propertyIndex];
                            }
                        } else {
                            feature.properties.batchId = propertyIndex;
                        }
                        /* WIP on coloring features with same batchId 
                        const object = intersect.object;
                        const count = object.geometry.attributes.position.count;

                        let attribute = object.geometry.getAttribute('position');
                        let offset = attribute.offset;
                        let stride = attribute.data.stride;
                        let itemSize = attribute.itemSize;
                        //const positions = attribute.data.array.filter((d,i)=>i % stride >= offset-1 && i % stride <= itemSize-1);
                        let positions = new THREE.BufferAttribute( new Float32Array( count * 3 ),3);
                        for (let i =0;i<=count;i++){
                            mypositions.setXYZ(i,attribute.getX(i),attribute.getY(i),attribute.getZ(i));
                        }
                        
                        //const normals = attributes.normal.data.array.filter((d,i)=>i % 7 >= 0 && i % 7 <= 2);
                        

                        object.geometry.setAttribute( 'color', new THREE.BufferAttribute( new Float32Array( count * 3 ), 3 ) );
                        for ( let i = 0; i < count; i ++ ) {
                            const color = new THREE.Color();
                            const positions = object.geometry.attributes.position;
                            const colors = object.geometry.attributes.color;
                            if (geometry.attributes._batchid.data.array[i * 7 + 6] == propertyIndex){
                                color.setRGB( ( positions.getY( i ) / radius + 1 ) / 2, 1.0, 0.5 );
                            }
                            else {
                                color.setRGB( 0.9, 0.9, 0.9 );
                            }
                            colors.setXYZ( i, color.r, color.g, color.b );
                        }
                        
                        const material = new THREE.MeshPhongMaterial( {
                            color: 'white',
                            flatShading: true,
                            vertexColors: true,
                            shininess: 0
                        } );
                        
                        object.material = material;
                        /* End of WIP on coloring */

                    } else {
                        if (intersect.index != null) {
                            feature.properties.index = intersect.index;
                        } else {
                            feature.properties.name = this.id;
                        }
                    }
                    /* WORK in progress 
                    if (options.outline != false && (intersect.object !== this.outlinedObject || 
                      (propertyIndex != null && propertyIndex !== this.outlinePropertyIndex) 
                        || (propertyIndex == null && intersect.index !== this.outlineIndex))) {
                      
                      //WIP
                      
                      //this.outlinePass.selectedObjects = [intersect.object];
                
                      // update outline
                      if (this.outlineMesh) {
                      let parent = this.outlineMesh.parent;
                      parent.remove(this.outlineMesh);
                      this.outlineMesh = null;
                      }
                      this.outlinePropertyIndex = propertyIndex;
                      this.outlineIndex = intersect.index;
                      if (intersect.object instanceof THREE.Mesh) {
                      this.outlinedObject = intersect.object;
                      let outlineMaterial = new THREE.MeshBasicMaterial({color: options.outlineColor? options.outlineColor : 0xff0000, wireframe: true});
                      let outlineMesh;
                      if (intersect.object && 
                        intersect.object.geometry && 
                        intersect.object.geometry.attributes && 
                        intersect.object.geometry.attributes._batchid) {
                        // create new geometry from faces that have same _batchid
                        let geometry = intersect.object.geometry;
                        if (geometry.index) {
                        let ip1 = geometry.index.array[intersect.faceIndex*3];
                        let idx = geometry.attributes._batchid.data.array[ip1*7+6];
                        let blockFaces = [];
                        for (let faceIndex = 0; faceIndex < geometry.index.array.length; faceIndex += 3) {
                          let p1 = geometry.index.array[faceIndex];
                          if (geometry.attributes._batchid.data.array[p1*7+6] === idx) {
                          let p2 = geometry.index.array[faceIndex+1];
                          if (geometry.attributes._batchid.data.array[p2*7+6] === idx) {
                            let p3 = geometry.index.array[faceIndex+2];
                            if (geometry.attributes._batchid.data.array[p3*7+6] === idx) {
                            blockFaces.push(faceIndex);
                            }
                          }
                          }
                        }  
                        let highLightGeometry = new THREE.Geometry(); 
                        for (let vertexCount = 0, face = 0; face < blockFaces.length; face++) {
                          let faceIndex = blockFaces[face];
                          let p1 = geometry.index.array[faceIndex];
                          let p2 = geometry.index.array[faceIndex+1];
                          let p3 = geometry.index.array[faceIndex+2];
                          let positions = geometry.attributes.position.data.array;
                          highLightGeometry.vertices.push(
                          new THREE.Vector3(positions[p1*7], positions[p1*7+1], positions[p1*7+2]),
                          new THREE.Vector3(positions[p2*7], positions[p2*7+1], positions[p2*7+2]),
                          new THREE.Vector3(positions[p3*7], positions[p3*7+1], positions[p3*7+2]),
                          )
                          highLightGeometry.faces.push(new THREE.Face3(vertexCount, vertexCount+1, vertexCount+2));
                          vertexCount += 3;
                        }
                        highLightGeometry.computeBoundingSphere();
                        outlineMesh = new THREE.Mesh(highLightGeometry, outlineMaterial);
                        } else {
                        let ip1 = intersect.faceIndex*3;
                        let idx = geometry.attributes._batchid.array[ip1];
                        let blockFaces = [];
                        for (let faceIndex = 0; faceIndex < geometry.attributes._batchid.array.length; faceIndex += 3) {
                          let p1 = faceIndex;
                          if (geometry.attributes._batchid.array[p1] === idx) {
                          let p2 = faceIndex + 1;
                          if (geometry.attributes._batchid.array[p2] === idx) {
                            let p3 = faceIndex + 2;
                            if (geometry.attributes._batchid.array[p3] === idx) {
                            blockFaces.push(faceIndex);
                            }
                          }
                          }
                        }
                        let highLightGeometry = new THREE.Geometry(); 
                        for (let vertexCount = 0, face = 0; face < blockFaces.length; face++) {
                          let faceIndex = blockFaces[face] * 3;
                          let positions = geometry.attributes.position.array;
                          highLightGeometry.vertices.push(
                          new THREE.Vector3(positions[faceIndex], positions[faceIndex+1], positions[faceIndex+2]),
                          new THREE.Vector3(positions[faceIndex+3], positions[faceIndex+4], positions[faceIndex+5]),
                          new THREE.Vector3(positions[faceIndex+6], positions[faceIndex+7], positions[faceIndex+8]),
                          )
                          highLightGeometry.faces.push(new THREE.Face3(vertexCount, vertexCount+1, vertexCount+2));
                          vertexCount += 3;
                        }
                        highLightGeometry.computeBoundingSphere();   
                        outlineMesh = new THREE.Mesh(highLightGeometry, outlineMaterial);
                        }
                      } else {
                        outlineMesh = new THREE.Mesh(this.outlinedObject.geometry, outlineMaterial);
                      }
                      outlineMesh.position.x = this.outlinedObject.position.x+0.1;
                      outlineMesh.position.y = this.outlinedObject.position.y+0.1;
                      outlineMesh.position.z = this.outlinedObject.position.z+0.1;
                      outlineMesh.quaternion.copy(this.outlinedObject.quaternion);
                      outlineMesh.scale.copy(this.outlinedObject.scale);
                      outlineMesh.matrix.copy(this.outlinedObject.matrix);
                      outlineMesh.raycast = () =>{};
                      outlineMesh.name = "outline";
                      outlineMesh.wireframe = true;
                      this.outlinedObject.parent.add(outlineMesh);
                      this.outlineMesh = outlineMesh;
                      
                      }
                    }
                    /* END OF work in progress */
                    result.unshift(feature);
                    this.map.triggerRepaint();
                } else {
                    this.outlinedObject = null;
                    if (this.outlineMesh) {
                        let parent = this.outlineMesh.parent;
                        parent.remove(this.outlineMesh);
                        this.outlineMesh = null;
                        this.map.triggerRepaint();
                    }
                }
            }
        }

        return result;
    }

    _update() {
        this.renderer.state.reset();
        //WIP on composer
        //this.composer.render ();
        this.renderer.render(this.scene, this.camera);

        /*if (this.loadStatus == 1) { // first render after root tile is loaded
        this.loadStatus = 2;
        let frustum = new THREE.Frustum();
        frustum.setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse));
        if (this.tileset.root) {
          this.tileset.root.checkLoad(frustum, this.getCameraPosition());
        }
        }*/
    }

    update() {
        requestAnimationFrame(() => this._update());
    }

    render() {
        const markers = this.marker.getMarkers();
        for (let i = 0; i < markers.length; i++) {
            markers[i].renderer.render(markers[i].marker, this.camera);
            markers[i].renderer.domElement.style = 'position: absolute; top: 0; pointer-events: none;';

            for (let j = 0; j < markers[i].renderer.domElement.children.length; j++) {
                const child = markers[i].renderer.domElement.children[j];
                child.style = 'pointer-events: auto;';
                child.transform.baseVal[0].matrix.e -= child.firstChild.width.baseVal.value / 2;
                child.transform.baseVal[0].matrix.f -= child.firstChild.height.baseVal.value / 2;
            }
        }

        this._update();
    }
}
