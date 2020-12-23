import * as THREE from 'three';
import {
	scaleSequential
  } from 'd3-scale';
import {
	interpolateYlGnBu
} from 'd3-scale-chromatic';
import { color } from 'd3-color';


export default function applyStyle(scene,styleParams){
	let maincolor = null;
	if (styleParams.color != null) {
		maincolor = new THREE.Color(styleParams.color);
	}
	scene.traverse(child => {
			if (child instanceof THREE.Mesh) {

				if (styleParams.color != null) {
					child.material.color = maincolor;
				}
				if (styleParams.opacity != null) {
					child.material.opacity = styleParams.opacity;
					child.material.transparent = styleParams.opacity < 1.0 ? true : false;
				}
				
				// some gltf has wrong bounding data, recompute here
				child.geometry.computeBoundingBox();
				child.geometry.computeBoundingSphere();
				child.castShadow = true;

				//For changing individual colors later, we have to introduce vertexcolors
				//const color = new THREE.Color();
				const positions = child.geometry.attributes.position;
				const count = positions.count;
				child.geometry.setAttribute( 'color', new THREE.BufferAttribute( new Float32Array( count * 3 ), 3 ) );
				const colors = child.geometry.attributes.color;
				const color = new THREE.Color();
				const grey = new THREE.Color("rgb(20,20,20)");
				const ymin = child.geometry.boundingBox.min.y;
				const ymax = child.geometry.boundingBox.max.y;
				const ydiff = ymax - ymin;
				//Currently attributes are kind of hardcoded in the tiles and have to be unpacked 
				//let magnitude = scaleSequential(interpolateYlGnBu).domain([1600, 2020])
				//const colormap = child.parent.userData.attr.map(d=>magnitude(d[0]));
				for ( let i = 0; i < count; i ++ ) {
					//Assign every vertex it's own color
			
					//let batchid = child.geometry.attributes._batchid.getX(i);
					//let colorval = colormap[batchid];
					let colorval = child.material.color;
					color.set(colorval);
					//Create a little gradient from black to white
					//adding 0.3 not to start at black, dividing by 10 limits effect to bottom
					let greyval = Math.min( 0.6 + ( positions.getY( i ) + Math.abs( ymin )) / 3, 1 );
					color.lerp ( grey, 1-greyval ); //lerp to grey
					colors.setXYZ( i, color.r, color.g, color.b );
				}
				child.material.vertexColors = true;
				child.material.depthWrite = !child.material.transparent; // necessary for Velsen dataset?
				
			}
		});
		/*
		if (styleParams.color != null || styleParams.opacity != null) {
			let color = new THREE.Color(styleParams.color);
			scene.traverse(child => {
				if (child instanceof THREE.Mesh) {
					if (styleParams.color != null) 
						child.material.color = color;
						
					if (styleParams.opacity != null) {
						child.material.opacity = styleParams.opacity;
						child.material.transparent = styleParams.opacity < 1.0 ? true : false;
					}
				}
			});
		}*/
		if (styleParams.debugColor) {
			scene.traverse(child => {
				if (child instanceof THREE.Mesh) {
					child.material.color = styleParams.debugColor;
				}
			})
		}
		return scene;
	}
