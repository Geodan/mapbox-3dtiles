export class Utils {

    static checkIntersects(mouse_position,camera,scene) {
        function mouseToThree(mouseX, mouseY) {
            return new THREE.Vector3(
                mouseX / window.innerWidth * 2 - 1,
                -(mouseY / window.innerHeight) * 2 + 1,
                1
            );
        }
        function sortIntersectsByDistanceToRay(intersects) {
            return intersects.sort(d=>d.distanceToRay);
        }
        
        let raycaster = new THREE.Raycaster();
        //raycaster.params.Points.threshold = 1;
        
        let mouse_vector = mouseToThree(...mouse_position);
        console.log(mouse_vector);
        
        
        raycaster.setFromCamera(mouse_vector, camera);
        let intersects = raycaster.intersectObject(scene);
        if (intersects[0]) {
          let sorted_intersects = sortIntersectsByDistanceToRay(intersects);
          let intersect = sorted_intersects[0];
          intersect.face.color.set( 0x00ff00 );
          let idx = intersect.object.geometry.attributes._batchid.data.array[intersect.faceIndex*7+6];
          //console.log("Blockid:",intersect.object.parent.userData.id[idx]);
          
        } else {
          //removeHighlights();
          //hideTooltip();
        }
      }

    static loadSkybox (path) {
		let camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 100000);
		camera.up.set(0, 0, 1);
		let scene = new THREE.Scene();
        
        const shader = THREE.ShaderLib.equirect;
        const material = new THREE.ShaderMaterial({
            fragmentShader: shader.fragmentShader,
            vertexShader: shader.vertexShader,
            uniforms: shader.uniforms,
            depthWrite: false,
            side: THREE.BackSide,
        });

        let loader = new THREE.TextureLoader();
        loader.load('https://threejsfundamentals.org/threejs/resources/images/equirectangularmaps/tears_of_steel_bridge_2k.jpg',
            function loaded (texture) {
                texture.magFilter = THREE.LinearFilter;
                texture.minFilter = THREE.LinearFilter;
                material.uniforms.tEquirect.value = texture;
            }, function progress (xhr) {
                // console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );
            }, function error (xhr) {
                console.log('An error happened', xhr);
            }
        );
		

		let skyGeometry = new THREE.BoxBufferGeometry(500000, 500000, 500000);
		let skybox = new THREE.Mesh(skyGeometry, material);

		scene.add(skybox);

		// z up
		scene.rotation.x = Math.PI / 2;

		return {'camera': camera, 'scene': scene};
    };
}