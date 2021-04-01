import * as THREE from 'three';

import { GetIntersectingObjects } from './Utils.mjs'
import { internalGLTFCache } from './TileLoaders.mjs';

class FeatureInfo {
    constructor(world, map, camera, loader) {
        this.world = world;
        this.map = map;
        this.camera = camera;
        //this.id = id;
        //this.url = url;
        this.loader = loader;
    }

    _getTilesetID(o) {
        if(o.isTileset) {
            return o.tileset;
        } else {
            return this._getTilesetID(o.parent);
        }
    }

    getAt(result, x, y) {
        const intersects = GetIntersectingObjects(this.camera, this.world.children, this.map.transform.width, this.map.transform.height, x, y);

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
            feature.layer.id = this._getTilesetID(intersect.object);
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

                this.highlightTest(intersect);
                //intersect.object.material.emissive.setHex((2 * 8) % 2 > 1 ? 0xFFFF00 : 0xFF0000);
            } if (
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

                /* WIP on coloring features with same batchId */
                const object = intersect.object;
                const count = object.geometry.attributes.position.count;
                const batchId = object.geometry.attributes._batchid.getX(vertexIdx);
                
                //if (batchId != this.prevbatchId)
               //  {
                     const colors = [];
                     const normals = [];
                     const positions = [];

                    for (let i = 0;i<count;i++){ 
                       // if (object.geometry.attributes._batchid.getX(i) === this.prevbatchId) {
                       //     object.geometry.attributes.color.setXYZ(i,0.9,0.9,0.9);
                       // }
                       // object.geometry.attributes.color.setX(i,0.1);

                        if (object.geometry.attributes._batchid.getX(i) === batchId) {
                            colors.push(object.geometry.attributes.color.getX(i));
                            colors.push(object.geometry.attributes.color.getY(i));
                            colors.push(object.geometry.attributes.color.getZ(i));
                            //colors.push(object.geometry.attributes.color.getW(i));

                            normals.push(object.geometry.attributes.normal.getX(i));
                            normals.push(object.geometry.attributes.normal.getY(i));
                            normals.push(object.geometry.attributes.normal.getZ(i));
                           // normals.push(object.geometry.attributes.normal.getW(i));

                            positions.push(object.geometry.attributes.position.getX(i));
                            positions.push(object.geometry.attributes.position.getY(i));
                            positions.push(object.geometry.attributes.position.getZ(i));
                           // positions.push(object.geometry.attributes.position.getW(i));

                            //object.geometry.attributes.color.setX(i,0.1);
                        }
                    }

                    const geometry = new THREE.BufferGeometry();
                    
                    geometry.setAttribute( 'position', new THREE.BufferAttribute(new Float32Array(positions), 3 ) );
                    geometry.setAttribute( 'normal', new THREE.BufferAttribute(new Float32Array(normals), 3 ) );
                    geometry.setAttribute( 'color', new THREE.BufferAttribute(new Float32Array(colors), 3 ) );
                    const sphere = geometry.computeBoundingSphere();
                    console.log(sphere);

                    const material = new THREE.MeshBasicMaterial( { color: 0xff0000, side: THREE.DoubleSide } );
                    const mesh = new THREE.Mesh( geometry, material );

                    mesh.matrixWorld = object.matrixWorld.clone();
                    mesh.matrixWorldNeedsUpdate = true;

                    //geometry.scale(new Vector3(2, 2, 2));

                    this.world.add(mesh);
                    this.world.remove(object);
                    //this.scene.add(mesh);

                    //object.geometry.attributes.color.needsUpdate = true;
                    this.prevbatchId = batchId;
              //  }
                

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

        return result;
    }

    highlightTest(intersect) {
        this.customMaterial = new THREE.MeshBasicMaterial({
            color: 0xA63744,
            side: THREE.FrontSide,
            transparent: true,
            depthTest: true,
            opacity: 0.7
        });

        this.customMaterial.polygonOffset = true;
        this.customMaterial.polygonOffsetUnit = 1;
        this.customMaterial.polygonOffsetFactor = -5;

        const instanceId = intersect.instanceId; 
        const objectMatrix = new THREE.Matrix4();
        intersect.object.getMatrixAt(instanceId, objectMatrix);

        const cache = internalGLTFCache;
        var glbData = cache.get(intersect.object.model);
        this.glows = [];
        
        this.testScene = undefined;
        const resource = intersect.object.model;

        this.loader.parse(glbData, resource, (gltf) => {
            this.testScene = gltf.scene || gltf.scenes[0];
            this.testScene.rotateX(Math.PI / 2); // convert from GLTF Y-up to Mapbox Z-up
            this.testScene.matrixWorldNeedsUpdate = false;
            this.testScene.applyMatrix4(objectMatrix);
            this.testScene.updateMatrixWorld();

            this.testScene.traverse(child => {
                if (child instanceof THREE.Mesh) {
                    child.material = this.customMaterial;
                }
            });

            intersect.object.parent.add(this.testScene);
        });
    }
}

export default FeatureInfo;