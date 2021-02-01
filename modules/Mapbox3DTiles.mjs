import * as THREE from 'three';

import TileSet from './TileSet.mjs';
import Highlight from './Highlight.mjs';
import Marker from './Marker.mjs';
import applyStyle from './Styler.mjs'
import SceneManager from './SceneManager'

export class Mapbox3DTilesLayer {
    constructor(params) {
        if (!params) throw new Error('parameters missing for mapbox 3D tiles layer');
        if (!params.id) throw new Error('id parameter missing for mapbox 3D tiles layer');
        //if (!params.url) throw new Error('url parameter missing for mapbox 3D tiles layer');

        (this.id = params.id), (this.url = params.url);
        this.styleParams = {};
        this.projectToMercator = params.projectToMercator ? params.projectToMercator : false;
        
        if ('color' in params) this.styleParams.color = params.color;
        if ('opacity' in params) this.styleParams.opacity = params.opacity;
        if ('pointsize' in params) this.styleParams.pointsize = params.pointsize;

        this.style = params.style || this.styleParams; //styleparams to be replaced by style config
        this.loadStatus = 0;
        this.viewProjectionMatrix = null;
        this.type = 'custom';
        this.renderingMode = '3d';
    }

    loadVisibleTiles(cameraFrustum, cameraPosition) {
        if (this.tileset && this.tileset.root) {
            this.tileset.root.checkLoad(cameraFrustum, cameraPosition);
        }
    }

    onAdd(map, gl) {
        this.map = map;
        this.sceneManager = new SceneManager(map);
        this.mapQueryRenderedFeatures = map.queryRenderedFeatures.bind(this.map);
        this.map.queryRenderedFeatures = this.queryRenderedFeatures.bind(this);
        
        //raycaster for mouse events
        this.raycaster = new THREE.Raycaster();

        if (this.url) {
            this.tileset = new TileSet((ts) => {
                if (ts.loaded) {
                    //WIP, poor performance
                    ts.styleParams = this.style;
                    this.map.triggerRepaint();
                }
            });
            this.tileset
                .load(this.url, this.style, this.projectToMercator)
                .then(() => {
                    if (this.tileset.root) {
                        this.world = new THREE.Group();
                        this.world.name = 'flatMercatorWorld';
                        this.world.add(this.tileset.root.totalContent);
                        this.loadStatus = 1;
                        this.highlight = new Highlight(this.world, this.map);
                        this.marker = new Marker(this.world, this.map);
                        
                        this.sceneManager.addLayer(this, this.world);
                    }
                })
                .catch((error) => {
                    console.error(`${error} (${this.url})`);
                });
        }
    }

    onRemove(map, gl) {
        // todo: (much) more cleanup?
        this.map.queryRenderedFeatures = this.mapQueryRenderedFeatures;
        this.sceneManager.removeLayer(this);
    }

    setStyle(style) {
        //WIP
        this.style = style ? style : { color: 0xff00ff };
        applyStyle(this.world, this.style);
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

                //TODO: make this code nicer and more efficient
                /* temp disabled coloring 
                if ((intersects.length === 0 && this.previntersect) || (intersects.length && this.previntersect && intersects[0].object.uuid != this.previntersect.object.uuid)) {
                    const object = this.previntersect.object;
                    if (object.geometry.attributes.color) {
                        const count = object.geometry.attributes.position.count;
                        for (let i = 0;i<count;i++){
                            object.geometry.attributes.color.setXYZ(i, 0.9, 0.9, 0.9);
                        }
                        object.geometry.attributes.color.needsUpdate = true;
                    }
                    this.previntersect = null;
                }
                */
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
                    this.previntersect = intersect;
                    if (intersect.object.userData.b3dm) {
                        feature.properties['b3dm'] = intersect.object.userData.b3dm;
                    }

                    if (intersect.object) {
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
                        let vertexIdx = intersect.face.a;
                        //Next line likely replaces the need for checking (un)indexed BufferGeometry
                        propertyIndex = intersect.object.geometry.attributes._batchid.getX(vertexIdx);
                        /*
                        if (geometry.index) {
                            // indexed BufferGeometry
                            vertexIdx = geometry.index.array[intersect.faceIndex * 3];
                            propertyIndex = geometry.attributes._batchid.data.array[vertexIdx * 7 + 6];
                        } else {
                            // un-indexed BufferGeometry
                            propertyIndex = geometry.attributes._batchid.array[vertexIdx * 3];
                        }*/
                        feature.properties.batchId = propertyIndex;
                        let keys = Object.keys(intersect.object.parent.userData);
                        if (keys.length) {
                            for (let propertyName of keys) {
                                feature.properties[propertyName] =
                                    intersect.object.parent.userData[propertyName][propertyIndex];
                            }
                        }
                        /* WIP on coloring features with same batchId 
                        const object = intersect.object;
                        const count = object.geometry.attributes.position.count;
                        const batchId = object.geometry.attributes._batchid.getX(vertexIdx);
                        
                        if (batchId != this.prevbatchId)
                         {
                            for (let i = 0;i<count;i++){ 
                                if (object.geometry.attributes._batchid.getX(i) === this.prevbatchId) {
                                    object.geometry.attributes.color.setXYZ(i,0.9,0.9,0.9);
                                }
                                else if (object.geometry.attributes._batchid.getX(i) === batchId) {
                                    object.geometry.attributes.color.setX(i,0.1);
                                }
                            }
                            object.geometry.attributes.color.needsUpdate = true;
                            this.prevbatchId = batchId;
                        }
                        */

                        /*
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

    render() {
        if (this.marker)
        { 
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
        }
    }
}
