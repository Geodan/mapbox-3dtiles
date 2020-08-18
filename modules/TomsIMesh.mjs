import * as THREE from '../node_modules/three/build/three.module.js';

export async function IMesh(inmesh, positions, normalsRight, normalsUp, inverseMatrix) {
	let matrix = new THREE.Matrix4();
	let position = new THREE.Vector3();
	let rotation = new THREE.Euler();
	let quaternion = new THREE.Quaternion();
	let scale = new THREE.Vector3();

	let geometry = inmesh.geometry;
	geometry.translate( -3, -28, -65); //FIXME, magic numbers to get chairs more aligned to center
	
	let material = inmesh.material; 
	let mesh = new THREE.InstancedMesh( geometry, material, positions.length/3 );
	
	for ( let i=0;i < positions.length /3; i+=3) {
		//TODO: use matix function for this
		position = {
			x: positions[i]+ inverseMatrix.elements[12],
			y: positions[i+1]+ inverseMatrix.elements[13],
			z: positions[i+2]+ inverseMatrix.elements[14]
		}
		//TODO: add rotation based on normalsUp and normalsRight
		rotation.x = -1.5 * Math.PI;
		rotation.y = 2 * Math.PI;  //Math.atan2(normalsRight[i],normalsRight[i+1]); 
		rotation.z = 2 * Math.PI;
		quaternion.setFromEuler( rotation );
		scale.x = scale.y = scale.z = 1;

		matrix.compose( position, quaternion, scale );
		mesh.setMatrixAt( i, matrix );
	}
	
	return mesh;
}