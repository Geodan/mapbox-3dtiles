var Mapbox3DTiles = new function() {
	var WEBMERCATOR_EXTENT = 20037508.3427892;
	var THREE = window.THREE;
	var DEBUG = false;
	
	var TileSet = class {
		constructor(){
			this.url = null;
			this.version = null;
			this.gltfUpAxis = 'Z';
			this.geometricError = null;
			this.root = null;
		}
		load(url, scene, styleparams) {
			this.url = url;
			let resourcePath = THREE.LoaderUtils.extractUrlBase(url);
			let self = this;
			return new Promise((resolve, reject) => {
				fetch(self.url)
					.then(response => {
						if (!response.ok) {
							throw new Error(`HTTP ${response.status} - ${response.statusText}`);
						}
						return response;
					})
					.then(response => response.json())
					.then(json => {
						self.version = json.asset.version;
						self.geometricError = json.geometricError;
						self.root = new ThreeDeeTile(json.root, scene, resourcePath, styleparams);
					})
					.then(res => resolve(res))
					.catch(error => {
						console.error(error);
						reject(error);
					});
			});		
		}
	}

	var ThreeDeeTile = class {
		constructor(json, parentObj3D, resourcePath, styleparams) {
			this.loaded = false;
			this.styleparams = styleparams;
			this.resourcePath = resourcePath;
			let group = new THREE.Group(); // Three JS Object3D Group for this tile and all its children
			this.ThreeGroup = group;
			parentObj3D.add(group);
			this.boundingVolume = json.boundingVolume;
			if (this.boundingVolume && this.boundingVolume.box) {
				let b = this.boundingVolume.box;
				let extent = [b[0] - b[3], b[1] - b[7], b[0] + b[3], b[1] + b[7]];
				let sw = new THREE.Vector3(extent[0], extent[1], 0.0);
				let ne = new THREE.Vector3(extent[2], extent[3], b[11] * 2);
				this.box = new THREE.Box3(sw, ne);
				if (DEBUG) {
					let geom = new THREE.BoxGeometry(b[3] * 2, b[7] * 2, b[11] * 2);
					let edges = new THREE.EdgesGeometry( geom );
					let line = new THREE.LineSegments( edges, new THREE.LineBasicMaterial( { color: 0x800000 } ) );
					let trans = new THREE.Matrix4().makeTranslation(b[0], b[1], b[2]);
					line.applyMatrix(trans);
					this.ThreeGroup.add(line);
				}
			} else {
				this.extent = null;
				this.sw = null;
				this.ne = null;
				this.box = null;
			}
			this.refine = json.refine;
			this.geometricError = json.geometricError;
			this.transform = json.transform;
			this.content = json.content;
			let children = [];
			if (json.children) {
				json.children.forEach((childJSON) => { 
					children.push(new ThreeDeeTile(childJSON, group, resourcePath, styleparams)) 
				});
			}
			this.children = children;
		}
		load() {
			let self = this;
			this.ThreeGroup.visible = true;
			if (this.loaded) {
				return;
			}
			this.loaded = true;
			if (this.content) {
				let url = this.content.uri ? this.resourcePath + this.content.uri : this.resourcePath + this.content.url;
				if (!url) return;
				let type = url.slice(-4);
				if (type == 'b3dm') {
					let loader = new THREE.GLTFLoader();
					let b3dm = new B3DM(url);
					b3dm.load()
						.then(d => loader.parse(d.glbData, self.resourcePath, function(gltf) {
								if (self.styleparams.color != null || self.styleparams.opacity != null) {
									let color = new THREE.Color(self.styleparams.color);
									gltf.scene.traverse(child => {
										if (child instanceof THREE.Mesh) {
											if (self.styleparams.color != null) 
												child.material.color = color;
											if (self.styleparams.opacity != null) {
												child.material.opacity = self.styleparams.opacity;
												child.material.transparent = self.styleparams.opacity < 1.0 ? true : false;
											}
										}
									});
								}
								let children = gltf.scene.children;
								for (let i=0; i<children.length; i++) {
									if (children[i].isObject3D) 
										self.ThreeGroup.add(children[i]);
								}
							}, function(e) {
								throw new Error('error parsing gltf: ' + e);
							})
						)
				} else if (type == 'i3dm') {
					throw new Error('i3dm tiles not yet implemented');					
				} else if (type == 'pnts') {
					let pnts = new PNTS(url);
					pnts.load()
						.then(d => {
							let geometry = new THREE.BufferGeometry();
							geometry.addAttribute('position', new THREE.Float32BufferAttribute(d.points, 3));
							//geometry.addAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
							//geometry.computeBoundingSphere();
							let material = new THREE.PointsMaterial( { 
													size: self.styleparams.pointsize != null ? self.styleparams.pointsize : 1.0, 
													color: self.styleparams.color != null ? self.styleparams.color : 0x007722, 
													opacity: self.styleparams.opacity != null ? self.styleparams.opacity : 1.0
													} );
							self.ThreeGroup.add(new THREE.Points( geometry, material ));
						});
				} else if (type == 'cmpt') {
					throw new Error('cmpt tiles not yet implemented');
				} else {
					throw new Error('invalid tile type: ' + type);
				}
			}
		}
		unload() {
			this.ThreeGroup.visible = false;
			// TODO: should we also free up memory?
		}
		checkLoad(camera) {
			var frustum = new THREE.Frustum();
			frustum.setFromMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
			if (!frustum.intersectsBox(this.box)) {
				this.unload();
				return;
			}
			
			let sw = this.box.min.clone().project(camera);
			let ne = this.box.max.clone().project(camera);			
			let x1 = sw.x, x2 = ne.x;
			let y1 = sw.y, y2 = ne.y;
			let dist = Math.sqrt((x2 - x1)*(x2 - x1) + (y2 - y1)*(y2 - y1)); // distance in screen space
			
			if (dist < 0.2) {
				this.unload();
			}
			// do nothing between 0.2 and 0.25 to avoid excessive tile loading/unloading
			else if (dist > 0.25) {
				this.load();
				this.children.forEach(child => {
					child.checkLoad(camera);
				});
			}
			
		}
	}

	var TileContent = class {
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
		load() {
			let self = this;
			return new Promise((resolve, reject) => {
				fetch(self.url)
					.then(response => {
						if (!response.ok) {
							throw new Error(`HTTP ${response.status} - ${response.statusText}`);
						}
						return response;
					})
					.then(response => response.arrayBuffer())
					.then(buffer => self.parseResponse(buffer))
					.then(res => resolve(res))
					.catch(error => {
						reject(error);
					});
			});		
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
	
	var B3DM = class extends TileContent {
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

	var PNTS = class extends TileContent{
		constructor(url) {
			super(url);
			this.points = new Float32Array();
		}
		parseResponse(buffer) {
			super.parseResponse(buffer);
			
			if (this.featureTableJSON.POINTS_LENGTH && this.featureTableJSON.POSITION) {
				let len = this.featureTableJSON.POINTS_LENGTH;
				let pos = this.featureTableJSON.POSITION.byteOffset;
				this.points = new Float32Array(this.featureTableBinary.slice(pos, pos + len * Float32Array.BYTES_PER_ELEMENT * 3));
			}
			
			return this;
		}
	}
	
	var transform2mapbox = function (matrix) {
		const min = -WEBMERCATOR_EXTENT;
		const max = WEBMERCATOR_EXTENT;
		const scale = 1 / (2 * WEBMERCATOR_EXTENT);
		
		let result = matrix.slice(); // copy array
		result[12] = (matrix[12] - min) * scale; // x translation
		result[13] = (matrix[13] - max) * scale * -1; // y translation
		result[14] = matrix[14] * scale; // z translation
		
		return new THREE.Matrix4().fromArray(result).scale(new THREE.Vector3(scale, -scale, scale));
	}

	var webmercator2mapbox = function(x, y, z) {
		const min = -WEBMERCATOR_EXTENT;
		const max = WEBMERCATOR_EXTENT;
		const range = 2 * WEBMERCATOR_EXTENT;
		
		return ([(x - min) / range, (y - max) / range * -1, z / range]);
	}

	this.Layer = function(params) {
		if (!params) throw new Error('parameters missing for mapbox 3D tiles layer');
		if (!params.id) throw new Error('id parameter missing for mapbox 3D tiles layer');
		if (!params.url) throw new Error('url parameter missing for mapbox 3D tiles layer');
		
		this.id = params.id,
		this.url = params.url;
		let styleparams = {};
		if ('color' in params) styleparams.color = params.color;
		if ('opacity' in params) styleparams.opacity = params.opacity;
		if ('pointsize' in params) styleparams.pointsize = params.pointsize;
		
		this.type = 'custom',
		this.renderingMode = '3d',
		this.onAdd = function(map, gl) {
			this.map = map;
			this.camera = new THREE.Camera();
			this.scene = new THREE.Scene();
			this.rootTransform = new THREE.Matrix4();

			let directionalLight = new THREE.DirectionalLight(0xffffff);
			directionalLight.position.set(0, -70, 100).normalize();
			this.scene.add(directionalLight);

			let directionalLight2 = new THREE.DirectionalLight(0x999999);
			directionalLight2.position.set(0, 70, 100).normalize();
			this.scene.add(directionalLight2);
			
			this.tileset = new TileSet();
			let self = this;
			this.tileset.load(this.url, this.scene, styleparams).then(function(){
				let scale = 1 / (2 * WEBMERCATOR_EXTENT);
				self.rootTransform = transform2mapbox(self.tileset.root.transform);

				//self.tileset.root.checkLoad(self.camera);
				map.on('move', function() {
					self.tileset.root.checkLoad(self.camera);
				});
			});
			
			this.renderer = new THREE.WebGLRenderer({
				canvas: map.getCanvas(),
				context: gl
			});
			this.renderer.autoClear = false;
		},
		this.render = function(gl, matrix) {
			var l = new THREE.Matrix4().fromArray(matrix);
			this.camera.projectionMatrix.elements = matrix;
			this.camera.projectionMatrix = l.multiply(this.rootTransform);
			this.renderer.state.reset();
			this.renderer.render(this.scene, this.camera);
			//this.map.triggerRepaint();
		}
	}
}