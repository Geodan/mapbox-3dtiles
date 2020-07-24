/* EXPERIMENTAL: */

export default function InstanceRender(gltf, positions, normalsUp, normalsRight) {
	let count = positions.length / 3;

  var meshes = [];
  
  gltf.scene.traverse(child => {
      if (child instanceof THREE.Mesh) {
          //console.log(child.name);
      }
  });
	
	var scene = new THREE.Scene();
	
	let matrix = new THREE.Matrix4();
	matrix.makeRotationX(Math.PI/2);
	scene.applyMatrix4(matrix);
	
	// mesh vertices (replace with the geometry of the actual mesh unindexed if it doesnt work, and converted from geometry to buffergeometry)
	var vertices = [];
	
	// Temporary triangle to replace an actual mesh
	vertices.push(25, -25, 0);
	vertices.push(-25, 25, 0);
	vertices.push(0, 0, 25);
	
	var colors = [];
	for (var i = 0; i < instances; ++i) {
		colors.push(Math.random(), Math.random(), Math.random(), 1);
	}
	
	var geometry = new THREE.InstancedBufferGeometry();
	geometry.instanceCount = count;
		
	// Load mesh positions into shader.
	geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices), 3);
	
	// Load world positions into shader.
	geometry.setAttribute('offset', new THREE.InstancedBufferAttribute(positions), 3);
	// Load colors into shader
	geometry.setAttribute('color', new THREE.InstancedBufferAttribute(new Float32Array(colors), 4));
	
	var material = new THREE.RawShaderMaterial({
		uniforms: {},
		vertexShader: vertexShader,
		fragmentShader: fragmentShader,
		side: THREE.DoubleSide,
		transparent: false
	});
	
	var mesh = new THREE.Mesh(geometry, material);
	scene.add(mesh);
}

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