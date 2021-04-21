import * as THREE from 'three';

export default function applyStyle(scene, styleParams) {
	const type = styleParams.type;
	const settings = styleParams.settings;

	switch (type) {
        case 'shade':
            return styleShade(scene, settings);
        case 'random':
            return styleRandom(scene, settings);
        case 'property':
            return styleProperty(scene, settings);
        case 'basic':
            return styleBasic(scene, settings);
    }
}

function getStylableMeshes(scene) {
	const meshes = [];
	scene.traverse(child => {
		if (child instanceof THREE.Mesh && child.stylable && child.stylable == true && child.geometry.attributes && child.geometry.attributes.position) {
			meshes.push(child);
		}
	});

	return meshes;
}

export function styleBasic(scene, styleParams) {
    const stylableMeshes = getStylableMeshes(scene);

    for (let i = 0; i < stylableMeshes.length; i++) {
        const child = stylableMeshes[i];
		child.material = new THREE.MeshStandardMaterial({
            color: styleParams.color ? styleParams.color : "#EFEFEF"
        });
    }

    return scene;
}

export function styleRandom(scene, styleParams) {
	const stylableMeshes = getStylableMeshes(scene);

	for (let i = 0; i < stylableMeshes.length; i++) {
		const child = stylableMeshes[i];
		const geom = child.geometry;
		const count = geom.attributes.position.count;
		geom.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
		const colors = geom.attributes.color;

		let batchColors = {};

		for (let i = 0; i < count; i++) {
			const batchID = geom.attributes._batchid.getX(i);

			if (!batchColors[batchID]) {
				batchColors[batchID] = { r: Math.random(), g: Math.random(), b: Math.random() };
			}

			colors.setXYZ(i, batchColors[batchID].r, batchColors[batchID].g, batchColors[batchID].b);
		}

		child.material.vertexColors = true;
		child.material.depthWrite = true;
	}

	return scene;
}

export function styleProperty(scene, styleParams) {
	const stylableMeshes = getStylableMeshes(scene);
	const property = styleParams.property;
	const colorParams = styleParams.colors;

	for (let i = 0; i < stylableMeshes.length; i++) {
		const child = stylableMeshes[i];
		const geom = child.geometry;
		const count = geom.attributes.position.count;
		geom.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
		const colors = geom.attributes.color;

		let batchColors = {};

		for (let i = 0; i < count; i++) {
			const batchID = geom.attributes._batchid.getX(i);

			if (!batchColors[batchID]) {
				const propertyValue = child.userData[property][batchID];

				if (propertyValue) {
					for (let j = 0; j < colorParams.length; j++) {
						const colorParam = colorParams[j];
						const color = byteColorToRGBFloat(colorParam.color);

						switch (colorParam.operator) {
							case "smaller-than":
								if (propertyValue < colorParam.value) {
									batchColors[batchID] = color;
								}
								break;
							case "greater-than":
								if (propertyValue > colorParam.value) {
									batchColors[batchID] = color;
								}
								break;
							case "range":
								if (propertyValue >= colorParam.value[0] && propertyValue <= colorParam.value[1]) {
									batchColors[batchID] = color;
								}
								break;
							case "equals":
								if (propertyValue.toLowerCase() == colorParam.value.toLowerCase()) {
									batchColors[batchID] = color;
								}
								break;
						}
					}
				}

				if (!batchColors[batchID] && styleParams.fallback) {
					batchColors[batchID] = byteColorToRGBFloat(styleParams.fallback);
				}
			}

			colors.setXYZ(i, batchColors[batchID].r, batchColors[batchID].g, batchColors[batchID].b);
		}

		child.material.vertexColors = true;
		child.material.depthWrite = true;
	}

	return scene;
}

function byteColorToRGBFloat(color) {
	return { r: color[0] / 255, g: color[1] / 255, b: color[2] / 255 };
}

export function styleShade(scene, styleParams) {
	let maincolor = null;
	if (styleParams.color != null) {
		maincolor = new THREE.Color(styleParams.color);
	}

	const stylableMeshes = getStylableMeshes(scene);

	for (let i = 0; i < stylableMeshes.length; i++) {
		const child = stylableMeshes[i];

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
		child.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
		const colors = child.geometry.attributes.color;
		const color = new THREE.Color();
		const grey = new THREE.Color("rgb(20,20,20)");
		const ymin = child.geometry.boundingBox.min.y;
		const ymax = child.geometry.boundingBox.max.y;
		const ydiff = ymax - ymin;
		//Currently attributes are kind of hardcoded in the tiles and have to be unpacked 
		//let magnitude = scaleSequential(interpolateYlGnBu).domain([1600, 2020])
		//const colormap = child.parent.userData.attr.map(d=>magnitude(d[0]));
		for (let i = 0; i < count; i++) {
			//Assign every vertex it's own color

			//let batchid = child.geometry.attributes._batchid.getX(i);
			//let colorval = colormap[batchid];
			let colorval = child.material.color;
			color.set(colorval);
			//Create a little gradient from black to white
			//adding 0.3 not to start at black, dividing by 10 limits effect to bottom
			let greyval = Math.min(0.8 + (positions.getY(i) + Math.abs(ymin)) / 1, 1);
			color.lerp(grey, 1 - greyval); //lerp to grey
			colors.setXYZ(i, color.r, color.g, color.b);
		}
		child.material.vertexColors = true;
		child.material.depthWrite = !child.material.transparent; // necessary for Velsen dataset?
	}

	if (styleParams.color != null || styleParams.opacity != null) {
		let color = new THREE.Color(styleParams.color);
		for (let i = 0; i < stylableMeshes.length; i++) {
			const child = stylableMeshes[i];
			if (styleParams.color != null)
				child.material.color = color;

			if (styleParams.opacity != null) {
				child.material.opacity = styleParams.opacity;
				child.material.transparent = styleParams.opacity < 1.0 ? true : false;
			}
		}
	}
	if (styleParams.debugColor) {
		for (let i = 0; i < stylableMeshes.length; i++) {
			const child = stylableMeshes[i];
			child.material.color = styleParams.debugColor;
		}
	}
	return scene;
}
