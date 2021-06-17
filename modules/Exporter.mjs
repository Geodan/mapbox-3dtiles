import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import * as THREE from 'three';

export default class Exporter {
    constructor(map, scene) {
        this.map = map;
        this.scene = scene;
    }

    exportGLTF(filename, options, scale) {
        const gltfExporter = new GLTFExporter();
        options = options ? options : {
            trs: false,
            onlyVisible: false,
            //truncateDrawRange: false,
            //includeCustomExtensions: true
        };
        scale = scale ? scale : 0.05;


        const group = new THREE.Group();
        group.add(this.scene);
        group.scale.set(scale, scale, scale);
        group.rotation.z = 90 * Math.PI / 180;
        group.rotation.x = -90 * Math.PI / 180;

       /*  this.scene.traverse((child) => {
            if (child instanceof THREE.Group) {
                child.position.set(0,0,child.position.z);
            }
        }); */

        this.map.triggerRepaint();

        gltfExporter.parse(group, (result) => {
            if (result instanceof ArrayBuffer) {
                this._saveArrayBuffer(result, filename);
            } else {
                const output = JSON.stringify(result, null, 2);
                this._saveString(output, filename);
            }
    
        }, options);
    }

    _save(blob, filename) {
        const link = document.createElement('a');
        link.style.display = 'none';
        document.body.appendChild(link); // Firefox workaround
    
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
    }
    
    _saveString(text, filename) {
        this._save(new Blob([text], { type: 'text/plain' }), filename);
    }
    
    _saveArrayBuffer(buffer, filename) {
        this._save(new Blob([buffer], { type: 'application/octet-stream' }), filename);
    }
}