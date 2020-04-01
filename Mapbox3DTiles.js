class Utils {
  static makePerspectiveMatrix(fovy, aspect, near, far) {
  
    let out = new THREE.Matrix4();
    let f = 1.0 / Math.tan(fovy / 2),
    nf = 1 / (near - far);
  
    let newMatrix = [
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) * nf, -1,
      0, 0, (2 * far * near) * nf, 0
    ]
  
    out.elements = newMatrix
    return out;
  }
}

const MERCATOR_A = 6378137.0;
const WORLD_SIZE = MERCATOR_A * Math.PI * 2;

ThreeboxConstants = {
  WORLD_SIZE: WORLD_SIZE,
  PROJECTION_WORLD_SIZE: WORLD_SIZE / (MERCATOR_A * Math.PI * 2),
  MERCATOR_A: MERCATOR_A,
  DEG2RAD: Math.PI / 180,
  RAD2DEG: 180 / Math.PI,
  EARTH_CIRCUMFERENCE: 40075000, // In meters
}
  
class CameraSync {
  constructor (map, camera, world) {
    this.map = map;
    this.camera = camera;
    this.active = true;
  
    this.camera.matrixAutoUpdate = false;   // We're in charge of the camera now!
  
    // Postion and configure the world group so we can scale it appropriately when the camera zooms
    this.world = world || new THREE.Group();
    this.world.position.x = this.world.position.y = ThreeboxConstants.WORLD_SIZE/2;
    this.world.matrixAutoUpdate = false;
  
    //set up basic camera state
    this.state = {
      fov: 0.6435011087932844, // Math.atan(0.75);
      translateCenter: new THREE.Matrix4,
      worldSizeRatio: 512/ThreeboxConstants.WORLD_SIZE
    };
  
    this.state.translateCenter.makeTranslation(ThreeboxConstants.WORLD_SIZE/2, -ThreeboxConstants.WORLD_SIZE / 2, 0);
  
    // Listen for move events from the map and update the Three.js camera. Some attributes only change when viewport resizes, so update those accordingly
    this.map.on('move', ()=>this.updateCamera());
    this.map.on('resize', ()=>this.setupCamera());
  
    this.setupCamera();
  }
  setupCamera() {
    var t = this.map.transform
    const halfFov = this.state.fov / 2;
    var cameraToCenterDistance = 0.5 / Math.tan(halfFov) * t.height;
    
    this.state.cameraToCenterDistance = cameraToCenterDistance;
    this.state.cameraTranslateZ = new THREE.Matrix4().makeTranslation(0,0,cameraToCenterDistance);
  
    this.updateCamera();
  }
  
  updateCamera(ev) {
  
    if(!this.camera) {
      console.log('nocamera')
      return;
    }
  
    var t = this.map.transform
  
    var halfFov = this.state.fov / 2;
    const groundAngle = Math.PI / 2 + t._pitch;
    this.state.topHalfSurfaceDistance = Math.sin(halfFov) * this.state.cameraToCenterDistance / Math.sin(Math.PI - groundAngle - halfFov);
  
  
    // Calculate z distance of the farthest fragment that should be rendered.
    const furthestDistance = Math.cos(Math.PI / 2 - t._pitch) * this.state.topHalfSurfaceDistance + this.state.cameraToCenterDistance;
  
    // Add a bit extra to avoid precision problems when a fragment's distance is exactly `furthestDistance`
    const farZ = furthestDistance * 1.01;    
  
    this.camera.projectionMatrix = Utils.makePerspectiveMatrix(this.state.fov, t.width / t.height, 1, farZ);
    
  
    var cameraWorldMatrix = new THREE.Matrix4();
    var rotatePitch = new THREE.Matrix4().makeRotationX(t._pitch);
    var rotateBearing = new THREE.Matrix4().makeRotationZ(t.angle);
  
    // Unlike the Mapbox GL JS camera, separate camera translation and rotation out into its world matrix
    // If this is applied directly to the projection matrix, it will work OK but break raycasting
  
    cameraWorldMatrix
      .premultiply(this.state.cameraTranslateZ)
      .premultiply(rotatePitch)
      .premultiply(rotateBearing)   
  
    this.camera.matrixWorld.copy(cameraWorldMatrix);
  
  
    var zoomPow = t.scale * this.state.worldSizeRatio;
  
    // Handle scaling and translation of objects in the map in the world's matrix transform, not the camera
    var scale = new THREE.Matrix4;
    var translateMap = new THREE.Matrix4;
    // var rotateMap = new THREE.Matrix4;    

    scale
      .makeScale( zoomPow, zoomPow , zoomPow );
  
    
    var x = -this.map.transform.x || -this.map.transform.point.x;
    var y = this.map.transform.y || this.map.transform.point.y;
  
    translateMap
      .makeTranslation(x, y, 0);
    
    //rotateMap
    //  .makeRotationZ(Math.PI);
  
    this.world.matrix = new THREE.Matrix4;
    this.world.matrix
      //.premultiply(rotateMap)
      .premultiply(this.state.translateCenter)
      .premultiply(scale)
      .premultiply(translateMap);
    
    this.camera.projectionMatrixInverse.getInverse(this.camera.projectionMatrix);
    this.frustum = new THREE.Frustum();
    
    //let worldCameraInverse = new THREE.Matrix4().getInverse(new THREE.Matrix4().multiplyMatrices(this.camera.matrixWorld, this.world.matrix));
    //this.frustum.setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(this.camera.projectionMatrix, worldCameraInverse));// this.camera.matrixWorldInverse));

    this.frustum.setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse));
    
    // utils.prettyPrintMatrix(this.camera.projectionMatrix.elements);
  }
}
  
class Mapbox3DTiles {
  static THREE = window.THREE;
  static DEBUG = true;  

  static TileSet = class {
    constructor(){
      this.url = null;
      this.version = null;
      this.gltfUpAxis = 'Z';
      this.geometricError = null;
      this.root = null;
    }
    async load(url, styleParams) {
      this.url = url;
      let resourcePath = THREE.LoaderUtils.extractUrlBase(url);
      try {
        let response = await fetch(this.url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} - ${response.statusText}`);
        }
        let json = await response.json();    
        this.version = json.asset.version;
        this.geometricError = json.geometricError;
        this.refine = json.refine ? json.refine.toUpperCase() : 'ADD';
        this.root = new Mapbox3DTiles.ThreeDeeTile(json.root, resourcePath, styleParams, this.refine, true);
      } catch(err) {
        throw new Error(err.message);
      }
      return;
    }
  }

  static ThreeDeeTile = class {
    constructor(json, resourcePath, styleParams, parentRefine, isRoot) {
      this.loaded = false;
      this.styleParams = styleParams;
      this.resourcePath = resourcePath;
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
        if (Mapbox3DTiles.DEBUG) {
          let geom = new THREE.BoxGeometry(b[3] * 2, b[7] * 2, b[11] * 2);
          let edges = new THREE.EdgesGeometry( geom );
          let color = new THREE.Color( 0xffffff );
          color.setHex( Math.random() * 0xffffff );
          let line = new THREE.LineSegments( edges, new THREE.LineBasicMaterial( {color:color }) );
          let trans = new THREE.Matrix4().makeTranslation(b[0], b[1], b[2]);
          line.applyMatrix4(trans);
          this.totalContent.add(line);
        }
      } else {
        this.extent = null;
        this.sw = null;
        this.ne = null;
        this.box = null;
        this.center = null;
      }
      this.refine = json.refine ? json.refine.toUpperCase() : parentRefine;
      this.geometricError = json.geometricError;
      this.transform = json.transform;
      if (this.transform) // && !isRoot) 
      { 
        // if not the root tile: apply the transform to the THREE js Group
        // the root tile transform is applied to the camera while rendering
        let tileMatrix = new THREE.Matrix4().fromArray(this.transform);
        this.totalContent.applyMatrix4(tileMatrix);
      }
      this.content = json.content;
      this.children = [];
      if (json.children) {
        for (let i=0; i<json.children.length; i++){
          let child = new Mapbox3DTiles.ThreeDeeTile(json.children[i], resourcePath, styleParams, this.refine, false);
          this.childContent.add(child.totalContent);
          this.children.push(child);
        }
      }
    }
    async load() {
      this.tileContent.visible = true;
      this.childContent.visible = true;
      if (this.loaded) {
        return;
      }
      this.loaded = true;
      if (this.content) {
        let url = this.content.uri ? this.content.uri : this.content.url;
        if (!url) return;
        if (url.substr(0, 4) != 'http')
          url = this.resourcePath + url;
        let type = url.slice(-4);
        if (type == 'json') {
          // child is a tileset json
          let tileset = new Mapbox3DTiles.TileSet();
          await tileset.load(url, this.styleParams);
          this.children.push(tileset.root);
          if (tileset.root) {
            if (tileset.root.transform) {
              // the root tile transform of a tileset is normally not applied because
              // it is applied by the camera while rendering. However, in case the tileset 
              // is a subset of another tileset, so the root tile transform must be applied 
              // to the THREE js group of the root tile.
              tileset.root.totalContent.applyMatrix4(new THREE.Matrix4().fromArray(tileset.root.transform));
            }
            this.childContent.add(tileset.root.totalContent);
          }
        } else if (type == 'b3dm') {
          let loader = new THREE.GLTFLoader();
          let b3dm = new Mapbox3DTiles.B3DM(url);
          let rotateX = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(1, 0, 0), Math.PI / 2);
          this.tileContent.applyMatrix4(rotateX); // convert from GLTF Y-up to Z-up
          let d = await b3dm.load();
          loader.parse(d.glbData, this.resourcePath, (gltf) => {
              gltf.scene.traverse(child => {
                if (child instanceof THREE.Mesh) {
                  // some gltf has wrong bounding data, recompute here
                  child.geometry.computeBoundingBox();
                  child.geometry.computeBoundingSphere();
                }
              });
              if (this.styleParams.color != null || this.styleParams.opacity != null) {
                let color = new THREE.Color(this.styleParams.color);
                gltf.scene.traverse(child => {
                  if (child instanceof THREE.Mesh) {
                    if (this.styleParams.color != null) 
                      child.material.color = color;
                    if (this.styleParams.opacity != null) {
                      child.material.opacity = this.styleParams.opacity;
                      child.material.transparent = this.styleParams.opacity < 1.0 ? true : false;
                    }
                  }
                });
              }
              this.tileContent.add(gltf.scene);
            }, (error) => {
              throw new Error('error parsing gltf: ' + error);
            }
          );
        } else if (type == 'pnts') {
          let pnts = new Mapbox3DTiles.PNTS(url);
          let d = await pnts.load();            
          let geometry = new THREE.BufferGeometry();
          geometry.addAttribute('position', new THREE.Float32BufferAttribute(d.points, 3));
          let material = new THREE.PointsMaterial();
          material.size = this.styleParams.pointsize != null ? this.styleParams.pointsize : 1.0;
          if (this.styleParams.color) {
            material.vertexColors = THREE.NoColors;
            material.color = new THREE.Color(this.styleParams.color);
            material.opacity = this.styleParams.opacity != null ? this.styleParams.opacity : 1.0;
          } else if (d.rgba) {
            geometry.addAttribute('color', new THREE.Float32BufferAttribute(d.rgba, 4));
            material.vertexColors = THREE.VertexColors;
          } else if (d.rgb) {
            geometry.addAttribute('color', new THREE.Float32BufferAttribute(d.rgb, 3));
            material.vertexColors = THREE.VertexColors;
          }
          this.tileContent.add(new THREE.Points( geometry, material ));
          if (d.rtc_center) {
            let c = d.rtc_center;
            this.tileContent.applyMatrix4(new THREE.Matrix4().makeTranslation(c[0], c[1], c[2]));
          }
          this.tileContent.add(new THREE.Points( geometry, material ));            
        } else if (type == 'i3dm') {
          throw new Error('i3dm tiles not yet implemented');          
        } else if (type == 'cmpt') {
          throw new Error('cmpt tiles not yet implemented');
        } else {
          throw new Error('invalid tile type: ' + type);
        }
      }
    }
    unload(includeChildren) {
      this.tileContent.visible = false;
      if (includeChildren) {
        this.childContent.visible = false;
      } else  {
        this.childContent.visible = true;
      }
      // TODO: should we also free up memory?
    }
    checkLoad(frustum, cameraPosition) {

     this.load();
     for (let i=0; i<this.children.length;i++) {
       this.children[i].checkLoad(frustum, cameraPosition);
     }
     return;
     


      // is this tile visible?
      
      if (!frustum.intersectsBox(this.box)) {
        console.log('outside frustum')
        this.unload(true);
        return;
      }
      
      let dist = this.box.distanceToPoint(cameraPosition);

      //console.log(`dist: ${dist}, geometricError: ${this.geometricError}`);
      // are we too far to render this tile?
      if (this.geometricError > 0.0 && dist > this.geometricError * 50.0) {
        console.log(`${dist} > ${this.geometricError}`)
        this.unload(true);
        return;
      }
      
      // should we load this tile?
      if (this.refine == 'REPLACE' && dist < this.geometricError * 20.0) {
        this.unload(false);
      } else {
        if (this.content) {
          console.log(`loading ${this.content.uri}`);
        } else {
          console.log(`loading ${this.resourcePath}`);
        }
        this.load();
      }
      
      // should we load its children?
      for (let i=0; i<this.children.length; i++) {
        if (dist < this.geometricError * 20.0) {
          this.children[i].checkLoad(frustum, cameraPosition);
        } else {
          this.children[i].unload(true);
        }
      }
      
      /*
      // below code loads tiles based on screenspace instead of geometricError,
      // not sure yet which algorith is better so i'm leaving this code here for now
      let sw = this.box.min.clone().project(camera);
      let ne = this.box.max.clone().project(camera);      
      let x1 = sw.x, x2 = ne.x;
      let y1 = sw.y, y2 = ne.y;
      let tilespace = Math.sqrt((x2 - x1)*(x2 - x1) + (y2 - y1)*(y2 - y1)); // distance in screen space
      
      if (tilespace < 0.2) {
        this.unload();
      }
      // do nothing between 0.2 and 0.25 to avoid excessive tile loading/unloading
      else if (tilespace > 0.25) {
        this.load();
        this.children.forEach(child => {
          child.checkLoad(camera);
        });
      }*/
      
    }
  }

  static TileLoader = class {
    // This class contains the common code to load tile content, such as b3dm and pnts files.
    // It is not to be used directly. Instead, subclasses are used to implement specific 
    // content loaders for different tile types.
    constructor(url) {
      this.url = url;
      this.type = url.slice(-4);
      this.version = null;
      this.byteLength = null;
      this.featureTableJSON = null;
      this.featureTableBinary = null;
      this.batchTableJson = null;
      this.batchTableBinary = null;
      this.binaryData = null;
    }
    async load() {
      try {

        let response = await fetch(this.url)            
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} - ${response.statusText}`);
        }
        let buffer = await response.arrayBuffer();
        let res = this.parseResponse(buffer);
        return res;
      } catch (error) {
        throw(new Error(error));
      }
    }
    parseResponse(buffer) {
      let header = new Uint32Array(buffer.slice(0, 28));
      let decoder = new TextDecoder();
      let magic = decoder.decode(new Uint8Array(buffer.slice(0, 4)));
      if (magic != this.type) {
        throw new Error(`Invalid magic string, expected '${this.type}', got '${this.magic}'`);
      }
      this.version = header[1];
      this.byteLength = header[2];
      let featureTableJSONByteLength = header[3];
      let featureTableBinaryByteLength = header[4];
      let batchTableJsonByteLength = header[5];
      let batchTableBinaryByteLength = header[6];
      
      /*
      console.log('magic: ' + magic);
      console.log('version: ' + this.version);
      console.log('featureTableJSONByteLength: ' + featureTableJSONByteLength);
      console.log('featureTableBinaryByteLength: ' + featureTableBinaryByteLength);
      console.log('batchTableJsonByteLength: ' + batchTableJsonByteLength);
      console.log('batchTableBinaryByteLength: ' + batchTableBinaryByteLength);
      */
      
      let pos = 28; // header length
      if (featureTableJSONByteLength > 0) {
        this.featureTableJSON = JSON.parse(decoder.decode(new Uint8Array(buffer.slice(pos, pos+featureTableJSONByteLength))));
        pos += featureTableJSONByteLength;
      } else {
        this.featureTableJSON = {};
      }
      this.featureTableBinary = buffer.slice(pos, pos+featureTableBinaryByteLength);
      pos += featureTableBinaryByteLength;
      if (batchTableJsonByteLength > 0) {
        this.batchTableJson = JSON.parse(decoder.decode(new Uint8Array(buffer.slice(pos, pos+batchTableJsonByteLength))));
        pos += batchTableJsonByteLength;
      } else {
        this.batchTableJson = {};
      }
      this.batchTableBinary = buffer.slice(pos, pos+batchTableBinaryByteLength);
      pos += batchTableBinaryByteLength;
      this.binaryData = buffer.slice(pos);
      return this;
    }
  }
  
  static B3DM = class extends Mapbox3DTiles.TileLoader {
    constructor(url) {
      super(url);
      this.glbData = null;
    }
    parseResponse(buffer) {
      super.parseResponse(buffer);
      this.glbData = this.binaryData;
      return this;
    }
  }

  static PNTS = class extends Mapbox3DTiles.TileLoader{
    constructor(url) {
      super(url);
      this.points = new Float32Array();
      this.rgba = null;
      this.rgb = null;
    }
    parseResponse(buffer) {
      super.parseResponse(buffer);
      if (this.featureTableJSON.POINTS_LENGTH && this.featureTableJSON.POSITION) {
        let len = this.featureTableJSON.POINTS_LENGTH;
        let pos = this.featureTableJSON.POSITION.byteOffset;
        this.points = new Float32Array(this.featureTableBinary.slice(pos, pos + len * Float32Array.BYTES_PER_ELEMENT * 3));
        this.rtc_center = this.featureTableJSON.RTC_CENTER;
        if (this.featureTableJSON.RGBA) {
          pos = this.featureTableJSON.RGBA.byteOffset;
          let colorInts = new Uint8Array(this.featureTableBinary.slice(pos, pos + len * Uint8Array.BYTES_PER_ELEMENT * 4));
          let rgba = new Float32Array(colorInts.length);
          for (let i=0; i<colorInts.length; i++) {
            rgba[i] = colorInts[i] / 255.0;
          }
          this.rgba = rgba;
        } else if (this.featureTableJSON.RGB) {
          pos = this.featureTableJSON.RGB.byteOffset;
          let colorInts = new Uint8Array(this.featureTableBinary.slice(pos, pos + len * Uint8Array.BYTES_PER_ELEMENT * 3));
          let rgb = new Float32Array(colorInts.length);
          for (let i=0; i<colorInts.length; i++) {
            rgb[i] = colorInts[i] / 255.0;
          }
          this.rgb = rgb;
        } else if (this.featureTableJSON.RGB565) {
          console.error('RGB565 is currently not supported in pointcloud tiles.')
        }
      }
      return this;
    }
  }
  
  static Layer = class {
    constructor (params) {
      if (!params) throw new Error('parameters missing for mapbox 3D tiles layer');
      if (!params.id) throw new Error('id parameter missing for mapbox 3D tiles layer');
      if (!params.url) throw new Error('url parameter missing for mapbox 3D tiles layer');
      
      this.id = params.id,
      this.url = params.url;
      this.styleParams = {};
      if ('color' in params) this.styleParams.color = params.color;
      if ('opacity' in params) this.styleParams.opacity = params.opacity;
      if ('pointsize' in params) this.styleParams.pointsize = params.pointsize;
  
      this.loadStatus = 0;
      this.viewProjectionMatrix = null;
      
      this.type = 'custom';
      this.renderingMode = '3d';
    }
    getCameraPosition() {
      if (!this.viewProjectionMatrix)
        return new THREE.Vector3();
      let cam = new THREE.Camera();
      let rootInverse = new THREE.Matrix4().getInverse(this.rootTransform);
      cam.projectionMatrix.elements = this.viewProjectionMatrix;
      cam.projectionMatrixInverse = new THREE.Matrix4().getInverse( cam.projectionMatrix );// add since three@0.103.0
      let campos = new THREE.Vector3(0, 0, 0).unproject(cam).applyMatrix4(rootInverse);
      return campos;
    }
    LightsArray() {
      const arr = [];
      let directionalLight1 = new THREE.DirectionalLight(0xffffff);
      directionalLight1.position.set(0.5, 1, 0.5).normalize();
      let target = directionalLight1.target.position.set(100000000, 1000000000, 0).normalize();
      arr.push(directionalLight1);
  
      let directionalLight2 = new THREE.DirectionalLight(0xffffff);
      //directionalLight2.position.set(0, 70, 100).normalize();
      directionalLight2.position.set(0.3, 0.3, 1).normalize();
      arr.push(directionalLight2);
  
      //arr.push(new THREE.DirectionalLightHelper( directionalLight1, 500));
      //arr.push(new THREE.DirectionalLightHelper( directionalLight2, 500));     
  
            //this.scene.background = new THREE.Color( 0xaaaaaa );
            //this.scene.add( new THREE.DirectionalLight() );
            //this.scene.add( new THREE.HemisphereLight() );
      return arr;
    }
    
    onAdd(map, gl) {
      this.map = map;
      const fov = 28;
      const aspect = map.getCanvas().width/map.getCanvas().height;
      const near = 0.000000000001;
      const far = Infinity;
            
      this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
      this.scene = new THREE.Scene();
      this.rootTransform = [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
      let lightsarray = this.LightsArray();
      lightsarray.forEach(light=>{
        this.scene.add(light);
      });
      this.world = new THREE.Group();
      this.world.name = 'world';
      this.scene.add(this.world);

      this.renderer = new THREE.WebGLRenderer({
        alpha: true, 
        antialias: true, 
        canvas: map.getCanvas(),
        context: gl
      });
      this.renderer.autoClear = false;

      this.cameraSync = new CameraSync(this.map, this.camera, this.world);
      
      //raycaster for mouse events
      this.raycaster = new THREE.Raycaster();
      this.tileset = new Mapbox3DTiles.TileSet();
      this.tileset.load(this.url, this.styleParams).then(()=>{
        /* this.tileset.root.checkLoad();
        this.world.add(this.tileset.root.totalContent);
        this.update();
        this.helperCamera = this.camera.clone();
        this.helper = new THREE.CameraHelper( this.helperCamera );
        this.scene.add( this.helper );
        */
        
        if (this.tileset.root) {
          this.world.add(this.tileset.root.totalContent);
          self.loadStatus = 1;
          this.tileset.root.checkLoad(this.cameraSync.frustum, this.getCameraPosition());
          this.update();
        }
        
      });
    }
    queryRenderedFeatures(point){
      if (!this.map || !this.map.transform) {
        return [];
      }

      var mouse = new THREE.Vector2();
      
      // // scale mouse pixel position to a percentage of the screen's width and height
      mouse.x = ( point.x / this.map.transform.width ) * 2 - 1;
      mouse.y = 1 - ( point.y / this.map.transform.height ) * 2;

      this.raycaster.setFromCamera(mouse, this.camera);

      // calculate objects intersecting the picking ray
      var intersects = this.raycaster.intersectObjects(this.world.children, true);

      return intersects
    }
    update() {
      this.renderer.state.reset();
      this.renderer.render (this.scene, this.camera);
      
      /*if (this.loadStatus == 1) { // first render after root tile is loaded
        this.loadStatus = 2;
        let frustum = new THREE.Frustum();
        frustum.setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse));
        if (this.tileset.root) {
          this.tileset.root.checkLoad(frustum, this.getCameraPosition());
        }
      }*/
    }
    render(gl, viewProjectionMatrix) {
      this.update();
    }
  }
}
