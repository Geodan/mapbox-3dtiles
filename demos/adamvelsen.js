import * as THREE from '../node_modules/three/build/three.module.js'
import { GLTFLoader} from '../node_modules/three/examples/jsm/loaders/GLTFLoader.js'

mapboxgl.accessToken = apiKeys.mapboxAccessToken;
const urlParams = new URLSearchParams(window.location.search);
const debug = urlParams.get('debug') ? urlParams.get('debug') == "true" : false;
const update = urlParams.get('update') ? parseInt(urlParams.get('update')) : 0;
const light = urlParams.get('light') ? urlParams.get('light') == "true" : false;
document.querySelector('#debug').checked = debug;
document.querySelector('#light').checked = light;
if (light) {
	document.querySelectorAll('.container').forEach(container=>container.classList.add('light'));
}

Mapbox3DTiles.DEBUG = debug;

document.querySelector('#rotterdam').addEventListener('click',()=>window.location=`${window.location.pathname}?debug=${debug}&light=${light}&update=${1+update}#15.97/51.899662/4.478322/34.4/58`);
document.querySelector('#velsen').addEventListener('click',()=>window.location=`${window.location.pathname}?debug=${debug}&light=${light}&update=${1+update}#17.65/52.455315/4.607382/-10.4/60`);
document.querySelector('#debug').addEventListener('change', function(e){
	window.location=`${window.location.pathname}?debug=${e.target.checked}&light=${light}${window.location.hash}`
});
document.querySelector('#light').addEventListener('change', function(e){
	window.location=`${window.location.pathname}?debug=${debug}&light=${e.target.checked}${window.location.hash}`
});

const style = {
	version: 8,
	name: 'EmptyStyle',
	id: 'emptystyle',
	sources: {},
	layers: [
	  {
		id: 'background',
		type: 'background',
		paint: { 'background-color': 'lightgrey' },
		layout: { visibility: 'visible' }
	  }
	]
  };
// Load the mapbox map
var map = new mapboxgl.Map({
	container: 'map',
	//style: style,
	//style: `mapbox://styles/mapbox/${light?'light':'dark'}-v10?optimize=true`,
	style: 'https://fileserv.beta.geodan.nl/mapbox/styles/basiskaart_style-dev.json',
	center: [4.94442925, 52.31300579],//Adam Arena
	//center: [5.11833, 52.08574],//Utrecht
	//center: [4.48630346, 51.90492609],//Rdam Katendrecht
	zoom: 14.3,
	bearing: 0,
	pitch: 45,
	hash: true
});



map.on('style.load', function() {
	map.showTileBoundaries = false;
	const rotterdam = new Mapbox3DTiles.Mapbox3DTilesLayer( { 
		id: 'rotterdam', 
		url: '../data/rotterdam/tileset.json', 
		color: 0x1111ff, 
		opacity: 1
	} );
	map.addLayer(rotterdam);

	const ahn = new Mapbox3DTiles.Mapbox3DTilesLayer( { 
		id: 'ahn', 
		url: '../data/ahn/tileset.json', 
		color: 0x007722, 
		opacity: 1.0,
		pointsize: 1.0
	} );
	map.addLayer(ahn, 'rotterdam');

	
	const buildingstyle = {
		color: 0xffffff,
		opacity: 1,
		colorAttribute: 'id',
	};

	const tileslayer = new Mapbox3DTiles.Mapbox3DTilesLayer({
		id: 'maquette',
		url: 'https://beta.geodan.nl/maquette_nl/data/buildingtiles_nl_3857/tileset.json',
		//url: 'https://beta.geodan.nl/maquette_nl/data//buildingtiles_2988_3857/tileset.json',
		style: buildingstyle 
	}, 'waterway-label');
	map.addLayer(tileslayer);
	window.tileslayer = tileslayer;
	
	
	

	const gltfLoader = new GLTFLoader();
	/*
	gltfLoader.load('https://docs.mapbox.com/mapbox-gl-js/assets/34M_17/34M_17.gltf', (gltf) => {
		let matrix = new THREE.Matrix4();
		matrix.makeRotationX(Math.PI/2);
		gltf.scene.applyMatrix4(matrix);
		let translation = projectToWorld([4.605698, 52.456063,0]);
		matrix.makeTranslation(translation.x, translation.y, translation.z);
		matrix.scale({x:1,y:1,z:1});
		gltf.scene.applyMatrix4(matrix);
		velsen.world.add(gltf.scene);
		//velsen.update();
		map.triggerRepaint();
	});
/*
	gltfLoader.load('./models/amsterdamcs.glb', (gltf) => {
		//let color = new THREE.Color(0xffffff);
		//gltf.scene.traverse(child => {
		//	if (child instanceof THREE.Mesh) {
		//		child.material.color = color;
		//	}
		//});
		let matrix = new THREE.Matrix4();
		matrix.makeRotationX(Math.PI/2);
		gltf.scene.applyMatrix4(matrix);
		matrix.makeRotationZ(1.162 * Math.PI);
		gltf.scene.applyMatrix4(matrix);
		gltf.scene.translateY(0);
		let translation = Mapbox3DTiles.projectToWorld([4.60814,52.46326,0]);
		matrix.makeTranslation(translation.x, translation.y, translation.z);
		matrix.scale({x:1,y:1,z:1});
		gltf.scene.applyMatrix4(matrix);
		velsen.world.add(gltf.scene);
		//velsen.update();
		map.triggerRepaint();
	});
	*/
	
/*
	const windmill_locations = [
		[4.57308780, 52.47002433],
		[4.57450344, 52.47288231]
		[4.57627680, 52.47565798]
	];
	windmill_locations.forEach(windmill_location=>{
	gltfLoader.load('../data/windmill/SM_Base.glb', (gltf) => {
		let color = new THREE.Color(0xffffff);
		gltf.scene.traverse(child => {
			if (child instanceof THREE.Mesh) {
				child.material.color = color;
			}
		});
		let matrix = new THREE.Matrix4();
		//matrix.makeRotationX(Math.PI/2);
		//gltf.scene.applyMatrix4(matrix);
		let translation = Mapbox3DTiles.projectToWorld(windmill_location);
		matrix.makeTranslation(translation.x, translation.y, translation.z);
		matrix.scale({x:.01,y:.01,z:.01});
		gltf.scene.applyMatrix4(matrix);
		tileslayer.world.add(gltf.scene);
		//velsen.update();
		map.triggerRepaint();
	});
	gltfLoader.load('../data/windmill/SM_Pillar.glb', (gltf) => {
		let color = new THREE.Color(0xffffff);
		gltf.scene.traverse(child => {
			if (child instanceof THREE.Mesh) {
				child.material.color = color;
			}
		});
		let matrix = new THREE.Matrix4();
		//matrix.makeRotationX(Math.PI/2);
		//gltf.scene.applyMatrix4(matrix);
		let translation = Mapbox3DTiles.projectToWorld(windmill_location);
		matrix.makeTranslation(translation.x, translation.y, translation.z);
		matrix.scale({x:.01,y:.01,z:.01});
		gltf.scene.applyMatrix4(matrix);
		tileslayer.world.add(gltf.scene);
		//velsen.update();
		map.triggerRepaint();
	});
	gltfLoader.load('../data/windmill/SM_Nacelle.glb', (gltf) => {
		let color = new THREE.Color(0xffffff);
		gltf.scene.traverse(child => {
			if (child instanceof THREE.Mesh) {
				child.material.color = color;
			}
		});
		let matrix = new THREE.Matrix4();
		//matrix.makeRotationX(Math.PI/2);
		//gltf.scene.applyMatrix4(matrix);
		let translation = Mapbox3DTiles.projectToWorld(windmill_location);
		matrix.makeTranslation(translation.x, translation.y, 100);
		matrix.scale({x:.01,y:.01,z:.01});
		gltf.scene.applyMatrix4(matrix);
		tileslayer.world.add(gltf.scene);
		//velsen.update();
		map.triggerRepaint();
	});
	gltfLoader.load('../data/windmill/SM_Rotor.glb', (gltf) => {
		let color = new THREE.Color(0xffffff);
		gltf.scene.traverse(child => {
			if (child instanceof THREE.Mesh) {
				child.material.color = color;
			}
		});
		let location = new THREE.Group();
		//gltf.scene.rotation.x = Math.PI;
		location.add(gltf.scene);
		let matrix = new THREE.Matrix4();
		let translation = Mapbox3DTiles.projectToWorld(windmill_location);
		matrix.makeTranslation(translation.x, translation.y-5, 100);
		matrix.scale({x:.01,y:.01,z:.01});
		location.applyMatrix4(matrix);
		tileslayer.world.add(location);
		let rotation = 0;
		//let rotorMatrix = new THREE.Matrix4();
		let start = new Date();
		let rotate = () => {
			requestAnimationFrame(rotate);
			let elapsed = Date.now() - start;
			rotation = Math.PI * (elapsed / 6000)
			gltf.scene.rotation.y = rotation;
			map.triggerRepaint();
		}
		//if (mapboxgl.supported({failIfMajorPerformanceCaveat: true})) {
			rotate();
		//}
	});
	
});
	*/
});
map.on('mousemove', (event)=>{
	let infoElement = document.querySelector('#info');
	let features = map.queryRenderedFeatures(event.point, {outline: true, outlineColor: 0xff0000});
	if (features.length) {
		infoElement.innerHTML = 
			features.map(feature=>
				`Layer: ${feature.layer.id}<br>
					${Object.entries(feature.properties).map(entry=>`<b>${entry[0]}:</b>${entry[1]}`).join('<br>\n')}
			`).join('<hr>\n')
	} else {
		infoElement.innerHTML = "Hover map objects for info";
	}
})
