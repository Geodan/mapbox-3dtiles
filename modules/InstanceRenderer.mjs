/* EXPERIMENTAL: */
import {MERCATOR_A, WORLD_SIZE, ThreeboxConstants} from "./Constants.mjs"

let project = function(coord){
	let webmerc = '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext  +no_defs';
	let ecef = '+proj=geocent +datum=WGS84 +units=m +no_defs';
	let newcoord =  proj4(ecef,webmerc,{x:coord[0],y:coord[1],z:coord[2]});
	return newcoord;
}

function projectToWorld(coords) {
	// Spherical mercator forward projection, re-scaling to WORLD_SIZE
	let c = ThreeboxConstants;
	var projected = [
		c.MERCATOR_A * c.DEG2RAD * coords[0] * c.PROJECTION_WORLD_SIZE,
		c.MERCATOR_A * Math.log(Math.tan((Math.PI*0.25) + (0.5 * c.DEG2RAD * coords[1]) )) * c.PROJECTION_WORLD_SIZE
	];
  
	//z dimension, defaulting to 0 if not provided
	if (!coords[2]) {
	  projected.push(0)
	} else {
		var pixelsPerMeter = projectedUnitsPerMeter(coords[1]);
		projected.push( coords[2] * pixelsPerMeter );
	}
  
	var result = new THREE.Vector3(projected[0], projected[1], projected[2]);
  
	return result;
  }

  export default function InstanceRender(gltf, positions, normalsRight, normalsUp, inverse) {

		let project = function(coord){
			let webmerc = '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext  +no_defs';
			let ecef = '+proj=geocent +datum=WGS84 +units=m +no_defs';
			let newcoord =  proj4(ecef,webmerc,{x:coord[0],y:coord[1],z:coord[2]});
			return newcoord;
	  }

	  let projpos = []; //WIP: projpos is a temporary hack to have positions reprojected from ECEF to Webmercator
	  for (let i=0;i < positions.length /3; i+=3){
			projpos.push(project([positions[i+0],positions[i+1],positions[i+2]]));
	  }
	  /* Temp hack to show points on positions */
	  var geometry = new THREE.BufferGeometry();
	  var color = new THREE.Color();
	  let pos = [];
	  let colors = [];
	  for ( var i = 0; i < projpos.length; i ++ ) {
			// positions (temp hack to substract tileset transform)
			var x = projpos[i].x;// - 549852;
			var y = projpos[i].y;// - 6856912;
			var z = projpos[i].z;
			pos.push( x, y, z );

			// colors
			color.setRGB( Math.random(), Math.random(), Math.random());
			colors.push( color.r, color.g, color.b );
	  }
	  geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( pos, 3 ) );
	  geometry.setAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );
	  geometry.computeBoundingSphere();
	  geometry.computeBoundingBox();
	  geometry.applyMatrix4(inverse);
	  var material = new THREE.PointsMaterial( { size: 15, vertexColors: true } );
	  return new THREE.Mesh( geometry, material);
  }

// export default function InstanceRender(gltf, positions, normalsUp, normalsRight, inverse) {
// 	let count = positions.length / 3;
// 	var meshes = [];

// 	let projected = [];
// 	for (let i=0; i < count; ++i){
// 		projected.push(project([positions[i+0] - 549852 ,positions[i+1] - 6856912,positions[i+2]]));
// 	}

// 	var a = new THREE.Mesh();
// 	gltf.scene.traverse(child => {
// 		if (child instanceof THREE.Mesh) {
// 			console.log(child.name);
// 		}
// 	});

// 	var scene = new THREE.Scene();

// 	let matrix = new THREE.Matrix4();
// 	matrix.makeRotationX(Math.PI/2);
// 	scene.applyMatrix4(matrix);

// 	// mesh vertices (replace with the geometry of the actual mesh unindexed if it doesnt work, and converted from geometry to buffergeometry)
// 	var vertices = [];

// 	// Temporary triangle to replace an actual mesh
// 	vertices.push(250, -250, 0);
// 	vertices.push(-250, 250, 0);
// 	vertices.push(0, 0, 250);

// 	var colors = [];
// 	for (var i = 0; i < count; ++i) {
// 		colors.push(Math.random(), Math.random(), Math.random(), 1);
// 	}

// 	var geometry = new THREE.InstancedBufferGeometry();
// 	geometry.instanceCount = count;
		
// 	// Load mesh positions into shader.
// 	geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

// 	// Load world positions into shader.
// 	geometry.setAttribute('offset', new THREE.InstancedBufferAttribute(new Float32Array(projected), 3));
// 	// Load colors into shader
// 	geometry.setAttribute('color', new THREE.InstancedBufferAttribute(new Float32Array(colors), 4));
	
// 	geometry.computeBoundingSphere();
// 	geometry.computeBoundingBox();
// 	//geometry.applyMatrix4(inverse);

// 	var material = new THREE.RawShaderMaterial({
// 		uniforms: {},
// 		vertexShader: vertexShader,
// 		fragmentShader: fragmentShader,
// 		side: THREE.DoubleSide,
// 		transparent: false
// 	});

// 	var mesh = new THREE.Mesh(geometry, material);
// 	scene.add(mesh);
// 	console.log(scene);
// 	return mesh;
// }

// function GetVector3FromData(data) {
// 	var array = [];
// 	var count = data.length;
// 	for (var i = 0; i < count; i+=3) {
// 		var pos = [data[i], data[i+1], data[i+2]]
// 		array.push(pos);
// 	}
// 	return array;
// }

// function GetVector4FromData(data) {
// 	var array = [];
// 	var count = data.length;
// 	for (var i = 0; i < count; i+=4) {
// 		array.push(data[i], data[i+1], data[i+2], data[i+3]);
// 	}
// 	return array;
// }

var vertexShader =
	`
	precision highp float;

	uniform mat4 modelViewMatrix;
	uniform mat4 projectionMatrix;

	attribute vec3 position;
	attribute vec3 offset;
	attribute vec4 color;
	attribute vec4 rotation;

	varying vec3 vPosition;
	varying vec4 vColor;

	void main(){

		vPosition = offset + position;

		vColor = color;

		gl_Position = projectionMatrix * modelViewMatrix * vec4( vPosition, 1.0 );

	}
	`
;

var fragmentShader =
	`
	precision highp float;

	varying vec3 vPosition;
	varying vec4 vColor;

	void main() {

		vec4 color = vec4( vColor );
		gl_FragColor = color;

	}
		`
;