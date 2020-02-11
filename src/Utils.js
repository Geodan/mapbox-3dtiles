export class Utils {
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