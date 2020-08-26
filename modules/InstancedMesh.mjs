import * as THREE from '../node_modules/three/build/three.module.js';

export async function IMesh(inmesh, positions, normalsRight, normalsUp, inverseMatrix, meshPosition) {
	
	let matrix = new THREE.Matrix4();
	let position = new THREE.Vector3();
	let rotation = new THREE.Euler();
	let quaternion = new THREE.Quaternion();
	let scale = new THREE.Vector3();
	inmesh.geometry.translate(meshPosition.x, meshPosition.y, meshPosition.z)
	inmesh.geometry.rotateX(Math.PI/2); // convert from GLTF Y-up to Z-up
	let geometry = inmesh.geometry;
	geometry.computeBoundingBox();

    let material = inmesh.material; 
	let instancedMesh = new THREE.InstancedMesh( geometry, material, positions.length/3 );
	instancedMesh.userData = inmesh.userData;

	for ( var i = 0; i < positions.length; i+=3 ) {
		//TODO: use matix function for this?
		position = {
			x: positions[i]+ inverseMatrix.elements[12],
			y: positions[i+1]+ inverseMatrix.elements[13],
			z: positions[i+2]+ inverseMatrix.elements[14],
		}
		
		rotation.set(0, 0, Math.atan2(normalsRight[i+1],normalsRight[i]));
		quaternion.setFromEuler( rotation );
		scale.x = scale.y = scale.z = 1.6; //FIXME: magic number, replace with meterInMercatorCoordinateUnits()
		//https://docs.mapbox.com/mapbox-gl-js/api/geography/#mercatorcoordinate-instance-members

		matrix.compose( position, quaternion, scale );
		instancedMesh.setMatrixAt( i/3, matrix );
	}
	
	return instancedMesh;
}