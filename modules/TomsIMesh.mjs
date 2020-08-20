import * as THREE from '../node_modules/three/build/three.module.js';

export async function IMesh(inmesh, positions, normalsRight, normalsUp, inverseMatrix, meshPosition) {
	/* Temporary projection stuff */
	let project = function(coord){
		let webmerc = '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext  +no_defs';
		let ecef = '+proj=geocent +datum=WGS84 +units=m +no_defs';
		//let newcoord =  proj4(ecef,webmerc,{x:coord[0],y:coord[1],z:coord[2]});
		let newcoord =  proj4(webmerc,webmerc,{x:coord[0],y:coord[1],z:coord[2]});
		return newcoord;
	}
	let projpos = []; //WIP: projpos is a temporary hack to have positions reprojected from ECEF to Webmercator
	for (let i=0;i < positions.length / 1; i+=3){
		let p = project([positions[i+0],positions[i+1],positions[i+2]]);
		projpos.push(p);
	}
	/* END OF Temporary projection stuff */
	
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
	let instancedMesh = new THREE.InstancedMesh( geometry, material, projpos.length );

	for ( var i = 0; i < projpos.length; i++ ) {
		//TODO: use matix function for this?
		position = {
			x: projpos[i].x+ inverseMatrix.elements[12],
			y: projpos[i].y+ inverseMatrix.elements[13],
			z: projpos[i].z+ inverseMatrix.elements[14],
		}
		
		rotation.set(0, 0, Math.atan2(normalsRight[i*3+1],normalsRight[i*3]));
		quaternion.setFromEuler( rotation );
		scale.x = scale.y = scale.z = 1;

		matrix.compose( position, quaternion, scale );
		instancedMesh.setMatrixAt( i, matrix );
	}
	
	return instancedMesh;
}