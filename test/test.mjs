import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader';
import { B3DM } from '../modules/TileLoaders.mjs';
import applyStyle from '../modules/Styler.mjs';


import {
	scaleSequential
  } from 'd3-scale';
import {
	interpolateYlGnBu
} from 'd3-scale-chromatic';
import { color } from 'd3-color';


window.THREE = THREE;

const treeurl = "https://fileserv.beta.geodan.nl/i3dm/amsterdam_trees/model_4/models/tree_4.glb";
const rotterdamurl = "../rotterdam/tiles/1.b3dm";
const amsterdamurl = "https://beta.geodan.nl/maquette_nl/data/buildingtiles_3594_3857/tiles/494.b3dm";
const url = amsterdamurl;

const vertexFunc = function(child){
	const positions = child.geometry.attributes.position;
	const count = positions.count;
	const colors = child.geometry.attributes.color;
	const color = new THREE.Color();
	const grey = new THREE.Color("rgb(20,20,20)");
	const ymin = child.geometry.boundingBox.min.y;
	const ymax = child.geometry.boundingBox.max.y;
	const ydiff = ymax - ymin;
	//Currently attributes are kind of hardcoded in the tiles and have to be unpacked 
	let magnitude = scaleSequential(interpolateYlGnBu).domain([1600, 2020])
	const colormap = child.parent.userData.attr.map(d=>magnitude(d[0]));
	for ( let i = 0; i < count; i ++ ) {
		//Assign every vertex it's own color

		let batchid = child.geometry.attributes._batchid.getX(i);
		let colorval = colormap[batchid];
		//let colorval = child.material.color;
		color.set(colorval);
		//Create a little gradient from black to white
		//adding 0.3 not to start at black, dividing by 10 limits effect to bottom
		let greyval = Math.min( 0.6 + ( positions.getY( i ) + Math.abs( ymin )) / 3, 1 );
		color.lerp ( grey, 1-greyval ); //lerp to grey
		colors.setXYZ( i, color.r, color.g, color.b );
	}
	
}

const _ = async() => {
	
	const b3dm = new B3DM(url);
	const b3dmData = await b3dm.load();
	let loader = new GLTFLoader().setDRACOLoader(new DRACOLoader().setDecoderPath('assets/wasm/')).setKTX2Loader(new KTX2Loader());

	loader.parse(b3dmData.glbData, url, (gltf) => {
		let scene = gltf.scene || gltf.scenes[0];
		//Add the batchtable to the userData since gltfLoader doesn't deal with it
		scene.userData = b3dmData.batchTableJson;
		if (scene.userData && Array.isArray(b3dmData.batchTableJson.attr)) {
			scene.userData.attr = scene.userData.attr.map(d=>d.split(","));
			scene.userData.b3dm= url.replace(url, '').replace('.b3dm', '');
		}
		const buildingstyle = {
			opacity: 1,
			colorAttribute: 'id',
			vertexFunc: vertexFunc
		};
		scene = applyStyle(scene,buildingstyle);
	});

}

_();