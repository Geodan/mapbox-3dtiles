import { BufferGeometryUtils } from '../node_modules/three/examples/jsm/utils/BufferGeometryUtils.js';
export function IMesh(gltf, positions, normalsRight, normalsUp, inverseMatrix) {

	let project = function(coord){
		let webmerc = '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext  +no_defs';
		let ecef = '+proj=geocent +datum=WGS84 +units=m +no_defs';
		let newcoord =  proj4(ecef,webmerc,{x:coord[0],y:coord[1],z:coord[2]});
		return newcoord;
	}
	let color = new THREE.Color();
	let colors = [];
	let projpos = []; //WIP: projpos is a temporary hack to have positions reprojected from ECEF to Webmercator
	for (let i=0;i < positions.length /3; i+=3){
		let p = project([positions[i+0],positions[i+1],positions[i+2]]);
		projpos.push(p);
		//color.setRGB( 1, 0, 0 );
		//colors.push( color.r, color.g, color.b );
	}
	
	let matrix = new THREE.Matrix4();
	let position = new THREE.Vector3();
	let rotation = new THREE.Euler();
	let quaternion = new THREE.Quaternion();
	let scale = new THREE.Vector3();

	let meshes = [];
	gltf.scene.traverse(child => {
		if (child instanceof THREE.Mesh) {
			meshes.push(child);
		}
	});

	let loader = new THREE.BufferGeometryLoader()
		.setPath( './data/models/' );
	let geometry = loader.load( 'suzanne_buffergeometry.json', function ( geometry ) {
			geometry.computeVertexNormals();
			return geometry;
	});
	let material = new THREE.MeshNormalMaterial();
	let mesh = new THREE.InstancedMesh( geometry, material, projpos.length );
	for ( var i = 0; i < projpos.length; i++ ) {
		position = projpos[i];
		rotation.x = 2 * Math.PI;
		rotation.y = 2 * Math.PI;
		rotation.z = 2 * Math.PI;
		quaternion.setFromEuler( rotation );
		scale.x = scale.y = scale.z = 1;

		matrix.compose( position, quaternion, scale );
		mesh.setMatrixAt( i, matrix );
	}
	mesh.applyMatrix4(inverseMatrix);
	return mesh;
	
	/*
	let geometry, material;
	
	let group = new THREE.Group();
	meshes.forEach(m=>{
		let geometry = m.geometry;
		let material = m.material;

		let mesh = new THREE.InstancedMesh( geometry, material, projpos.length );
		for ( var i = 0; i < projpos.length; i++ ) {
			position = projpos[i];
			rotation.x = 2 * Math.PI;
			rotation.y = 2 * Math.PI;
			rotation.z = 2 * Math.PI;
			quaternion.setFromEuler( rotation );
			scale.x = scale.y = scale.z = 1;

			matrix.compose( position, quaternion, scale );
			mesh.setMatrixAt( i, matrix );
		}
		mesh.applyMatrix4(inverseMatrix);
		group.add(mesh);
	});

	return group;



/*
	let bGeom = new THREE.BufferGeometry();
	bGeom = bGeom.toNonIndexed();
	let ibGeom = new THREE.InstancedBufferGeometry();
	ibGeom.setAttribute('position', bGeom.getAttribute('position'));
	ibGeom.setAttribute('offset', new THREE.InstancedBufferAttribute(new Float32Array(projpos), 3));
	ibGeom.setAttribute('color', new THREE.InstancedBufferAttribute(new Float32Array(colors), 3));
	ibGeom.computeVertexNormals();
	//ibGeom.computeBoundingSphere();
	ibGeom.applyMatrix4(inverseMatrix);
	
	let mat = new THREE.RawShaderMaterial({
		uniforms: {},
		vertexShader: vertexShader,
		fragmentShader: fragmentShader,
		side: THREE.DoubleSide,
		transparent: false
	});

	let mesh = new THREE.Mesh(ibGeom, mat);
	mesh.frustumCulled = false;
	return mesh;
*/

	/* Temp hack to show points on positions */
	/*
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
		color.setRGB( 1, 0, 0 );
		colors.push( color.r, color.g, color.b );
	}
	geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( pos, 3 ) );
	geometry.setAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );
	geometry.computeBoundingSphere();
	geometry.computeBoundingBox();

	//let inverseMatrix = new THREE.Matrix4().getInverse(this.worldTransform);
	geometry.applyMatrix4(inverseMatrix);
	var material = new THREE.PointsMaterial( { size: 15, vertexColors: true } );
	let pts = new THREE.Points( geometry, material );
	
	//this.tileContent.add(pts);
	return pts;
	*/
}