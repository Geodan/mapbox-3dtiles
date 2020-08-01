import * as THREE from '../node_modules/three/build/three.module.js';

export async function IMesh(inmesh, positions, normalsRight, normalsUp, inverseMatrix) {
	/* Temporary projection stuff */
	let project = function(coord){
		let webmerc = '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext  +no_defs';
		let ecef = '+proj=geocent +datum=WGS84 +units=m +no_defs';
		let newcoord =  proj4(ecef,webmerc,{x:coord[0],y:coord[1],z:coord[2]});
		return newcoord;
	}
	let projpos = []; //WIP: projpos is a temporary hack to have positions reprojected from ECEF to Webmercator
	for (let i=0;i < positions.length /3; i+=3){
		let p = project([positions[i+0],positions[i+1],positions[i+2]]);
		projpos.push(p);
	}
	/* END OF Temporary projection stuff */

	let up = [];
	for (let i=0; i < normalsUp.length; i+=3) {
		up.push(normalsUp[i], normalsUp[i+1], normalsUp[i+2]);
	}

	let right = [];
	for (let i=0; i < normalsRight.length; i+=3) {
		right.push(normalsRight[i], normalsRight[i+1], normalsRight[i+2]);
	}

	let matrix = new THREE.Matrix4();
	let position = new THREE.Vector3();
	let rotation = new THREE.Euler();
	let quaternion = new THREE.Quaternion();
	let scale = new THREE.Vector3();

	let geometry = inmesh.geometry;
	let material = inmesh.material; 
	let mesh = new THREE.InstancedMesh( geometry, material, projpos.length );
	for ( var i = 0; i < projpos.length; i++ ) {
		//TODO: use matix function for this
		position = {
			x: projpos[i].x+ inverseMatrix.elements[12] - 3.5,
			y: projpos[i].y+ inverseMatrix.elements[13] - 28.5,
			z: projpos[i].z+ inverseMatrix.elements[14] - 65
		}

		rotation.x = 2 * Math.PI;
		rotation.y = 2 * Math.PI;
		rotation.z = 2 * Math.PI;
		quaternion.setFromEuler( rotation );
		scale.x = scale.y = scale.z = 1;

		matrix.compose( position, quaternion, scale );
		mesh.setMatrixAt( i, matrix );
	}
	
	return mesh;
}