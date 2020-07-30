/* EXPERIMENTAL: */
export default function GetInstanceRenderedMeshesFromI3DMData(gltf, positions, normalsRight, normalsUp, inverse) {
	// Tom's useful projection function.
	let project = function(coord){
		let webmerc = '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext  +no_defs';
		let ecef = '+proj=geocent +datum=WGS84 +units=m +no_defs';
		let newcoord =  proj4(ecef,webmerc,{x:coord[0],y:coord[1],z:coord[2]});
		return newcoord;
	}

	let projpos = [];
	for (let i=0;i < positions.length /3; i+=3){
		projpos.push(project([positions[i+0],positions[i+1],positions[i+2]]));
	}

	// Extract components from GLTF 
	let gltfMeshes = GetMeshesFromGLTF(gltf);
	let gltfGeometries = GetGeometriesFromMeshes(gltfMeshes);
	let gltfMaterials = GetMaterialsFromMeshes(gltfMeshes);

	// Set data
	let instanceCount = positions.length / 3;
	let color = new THREE.Color();
	let colors = [];
	let offsets = [];
	let origin = projpos[0];


	for ( let i = 0; i < projpos.length; i ++ ) {
		let x = projpos[i].x - origin.x;
		let y = projpos[i].y - origin.y;
		let z = projpos[i].z - origin.z;
		offsets.push( x, y, z );
		color.setRGB( Math.random(), Math.random(), Math.random()); // Random colors until the material color is provided, currently it appears to only show black.
		colors.push( color.r, color.g, color.b );
	}

	// Make an instanced mesh for each mesh inside the gltf.
	let meshCount = gltfMeshes.length;
	let finalMeshes = [];
	for (var i = 0; i < meshCount; ++i) {
		let m = (GetInstancedGeometryFromGeometry(gltfGeometries[i], colors, instanceCount, offsets, inverse)); // colors should later be replaced by gltfMaterial[i]
		m.position.set(origin.x, origin.y, origin.z);
		finalMeshes.push(m);
	}
	return finalMeshes;
	//let mesh = new THREE.Mesh(instancedGeometry, material);
	// Set the position to the origin to offset the mesh where the geometries are drawn.
	// mesh.position.set(origin.x, origin.y, origin.z);
	//return mesh;

	// Tom's Rendering of Dots
	// var geometry = new THREE.BufferGeometry();
	// let worldpos = [];
	
	// for ( var i = 0; i < projpos.length; i ++ ) {
	// 	// positions (temp hack to substract tileset transform)
	// 	var x = projpos[i].x - origin.x;
	// 	var y = projpos[i].y - origin.y;
	// 	var z = projpos[i].z - origin.z;
	// 	worldpos.push( x, y, z );

	// 	// colors
	// 	color.setRGB( Math.random(), Math.random(), Math.random());
	// 	colors.push( color.r, color.g, color.b );
	// }
	// geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( worldpos, 3 ) );
	// geometry.setAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );
	// geometry.computeBoundingSphere();
	// geometry.computeBoundingBox();
	// geometry.applyMatrix4(inverse);
	// var material = new THREE.PointsMaterial( { size: 15, vertexColors: true } );
	
	// var weirdmesh = new THREE.Mesh(geometry, material);
	// weirdmesh.position.set(origin.x, origin.y, origin.z);
	// return weirdmesh;
}

/**
 * GetInstancedGeometryFromGeometry
 * @param geometry The geometry to instance render.
 * @param colors Instead of a material for now, since that is not yet working.
 * @param count The number of instances to make from one mesh.
 * @param offsets The positions that each instance offsets the final mesh origin.
 * @param inverse An inverse matrix that has been derived from the world transform.
 */
function GetInstancedGeometryFromGeometry(geometry, colors, count, offsets, inverse) { 	
	geometry = geometry.toNonIndexed();
	let instancedGeometry = new THREE.InstancedBufferGeometry();
	instancedGeometry.instanceCount = count;
	//instancedGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
	instancedGeometry.setAttribute('position', geometry.getAttribute('position'));
	instancedGeometry.setAttribute('offset', new THREE.InstancedBufferAttribute(new Float32Array(offsets), 3));
	instancedGeometry.setAttribute('color', new THREE.InstancedBufferAttribute(new Float32Array(colors), 3));
	instancedGeometry.computeVertexNormals();
	instancedGeometry.computeBoundingBox();
	instancedGeometry.applyMatrix4(inverse);

	let instancedMaterial = new THREE.RawShaderMaterial( {
		uniforms: {},
		vertexShader: vertexShader,
		fragmentShader: fragmentShader,
		side: THREE.DoubleSide,
		transparent: false
	});

	let mesh = new THREE.Mesh(instancedGeometry, instancedMaterial);
	return mesh;
} 

/**
 * GetMeshesFromGLTF
 * @param gltf The GLTF to extract the meshes from.
 */
function GetMeshesFromGLTF( gltf ) {
	var meshes = [];
	gltf.scene.traverse(child => {
		if (child instanceof THREE.Mesh) {
			meshes.push(child);
		}
	});
	return meshes;
}

/**
 * GetGeometriesFromMeshes
 * @param meshes The meshes to extract the geometries from.
 */
function GetGeometriesFromMeshes( meshes ) {
	var geometries = [];
	var meshCount = meshes.length;
	for (var i = 0; i < meshCount; ++i) {
		geometries.push(meshes[i].geometry);
	}
	return geometries;
}

/**
 * GetMaterialsFromMeshes
 * @param meshes The meshes to extract the materials from.
 */
function GetMaterialsFromMeshes( meshes ) {
	var materials = [];
	var meshCount = meshes.length;
	for (var i = 0; i < meshCount; ++i) {
		materials.push(meshes[i].material);
	}
	return materials;
}

var vertexShader =
	`
	precision highp float;

	uniform mat4 modelViewMatrix;
	uniform mat4 projectionMatrix;

	attribute vec3 position;
	attribute vec3 offset;
	attribute vec4 color;

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