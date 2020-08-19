import * as THREE from '../node_modules/three/build/three.module.js';

export async function IMesh(inmesh, positions, normalsRight, normalsUp, inverseMatrix) {
	/* Temporary projection stuff */
	let project = function(coord){
		let webmerc = '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext  +no_defs';
		let ecef = '+proj=geocent +datum=WGS84 +units=m +no_defs';
		//let newcoord =  proj4(ecef,webmerc,{x:coord[0],y:coord[1],z:coord[2]});
		let newcoord =  proj4(webmerc,webmerc,{x:coord[0],y:coord[1],z:coord[2]});
		return newcoord;
	}
	let projpos = []; //WIP: projpos is a temporary hack to have positions reprojected from ECEF to Webmercator
	for (let i=0;i < positions.length / 8; i+=3){
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

	console.log('new mesh');
	inmesh.geometry.computeBoundingBox();
	console.log(inmesh.geometry.boundingBox);

	inmesh.geometry.rotateX(Math.PI); // convert from GLTF Y-up to Z-up
	let geometry = inmesh.geometry;
	geometry.computeBoundingBox();
	console.log(geometry.boundingBox);

	let bbox = geometry.boundingBox;
	geometry.translate(-(bbox.max.x + bbox.min.x)/2, -(bbox.max.y + bbox.min.y)/2, -(bbox.max.z + bbox.min.z)/2);
	console.log(geometry.boundingBox);

	let material = inmesh.material; 
	let instancedMesh = new THREE.InstancedMesh( geometry, material, projpos.length );

	/*
	let matrix = new THREE.Matrix4();
	matrix.makeRotationX(Math.PI/2);
	gltf.scene.applyMatrix4(matrix);
	let translation = projectToWorld([4.605698, 52.456063,0]);
	matrix.makeTranslation(translation.x, translation.y, translation.z);
	matrix.scale({x:1,y:1,z:1});
	gltf.scene.applyMatrix4(matrix);
	velsen.world.add(gltf.scene);
	*/

	for ( var i = 0; i < projpos.length; i++ ) {
		//TODO: use matix function for this
		
		position = {
			x: projpos[i].x+ inverseMatrix.elements[12],// - 3.5,
			y: projpos[i].y+ inverseMatrix.elements[13],// - 28.5,
			z: projpos[i].z+ inverseMatrix.elements[14],// - 65
		}
		
		//position = projpos[i];

		//rotation.set(Math.atan(normalsUp[i*3]/normalsUp[i*3+1]), 0, 0);
		rotation.set(0, 0, 0)// Math.PI);
		quaternion.setFromEuler( rotation );
		scale.x = scale.y = scale.z = 1;

		matrix.compose( position, quaternion, scale );
		instancedMesh.setMatrixAt( i, matrix );
	}
	
	return instancedMesh;
}