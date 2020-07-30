import {projectToWorld} from "./Mapbox3DTiles.mjs"
export function IMesh(gltf, positions, normalsRight, normalsUp, inverseMatrix) {


	//Methode Anne
	/*
	let matrix = new THREE.Matrix4();
	matrix.makeRotationX(Math.PI/2);
	gltf.scene.applyMatrix4(matrix);
	let translation = projectToWorld([4.941869, 52.314396,0]);
	matrix.makeTranslation(translation.x, translation.y, translation.z);
	matrix.scale({x:1,y:1,z:1});
	//gltf.scene.applyMatrix4(matrix);
	*/
	let translation = projectToWorld([4.941869, 52.314396,0]);
	gltf.scene.traverse(child => {
		if (child instanceof THREE.Mesh) {
		  // some gltf has wrong bounding data, recompute here
		  child.geometry.computeBoundingBox();
		  child.geometry.computeBoundingSphere();
		  child.material.depthWrite = true; // necessary for Velsen dataset?
		  child.position.set(translation.x,translation.y,translation.z);
		}
	});
	return gltf.scene;

	/*
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
	for (let i=0;i< projpos.length;i++){
		let matrix = new THREE.Matrix4();
		//matrix.makeRotationX(Math.PI/2);
		//gltf.scene.applyMatrix4(matrix);
		matrix.makeTranslation(projpos[i].x,projpos[i].y,projpos[i].z);
		matrix.scale({x:1,y:1,z:1});
		gltf.scene.applyMatrix4(matrix);
		//gltf.scene.computeBoundingSphere();
		//gltf.scene.computeBoundingBox();
		let inverseMatrix = new THREE.Matrix4().getInverse(this.worldTransform);
		gltf.scene.applyMatrix4(inverseMatrix);
		
		this.tileContent.add(gltf.scene);
	}
	*/

}