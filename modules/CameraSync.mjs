import './Constants.mjs';
import * as THREE from 'three';
import { MERCATOR_A, WORLD_SIZE, ThreeboxConstants } from './Constants.mjs';

/* 
  mapbox-gl uses a camera fixed at the orgin (the middle of the canvas) The camera is only updated when rotated (bearing angle), 
  pitched or when the map view is resized.
  When panning and zooming the map, the desired part of the world is translated and zoomed in front of the camera. The world is only updated when
  the map is panned or zoomed.

  The mapbox-gl internal coordinate system has origin (0,0) located at longitude -180 degrees and latitude 0 degrees. 
  The scaling is 2^map.getZoom() * 512/EARTH_CIRCUMFERENCE_IN_METERS. At zoom=0 (scale=2^0=1), the whole world fits in 512 units.
*/
class CameraSync {

    constructor(map, camera, world) {
        this.map = map;
        this.camera = camera;
        this.active = true;
        this.updateCallback = null;
        this.camera.matrixAutoUpdate = false; // We're in charge of the camera now!

        // Postion and configure the world group so we can scale it appropriately when the camera zooms
        this.world = world || new THREE.Group();
        this.world.position.x = this.world.position.y = ThreeboxConstants.WORLD_SIZE / 2;
        this.world.matrixAutoUpdate = false;

        //set up basic camera state
        this.state = {
            fov: 0.6435011087932844, // Math.atan(0.75);
            translateCenter: new THREE.Matrix4(),
            worldSizeRatio: 512 / ThreeboxConstants.WORLD_SIZE
        };

        this.state.translateCenter.makeTranslation(
            ThreeboxConstants.WORLD_SIZE / 2,
            -ThreeboxConstants.WORLD_SIZE / 2,
            0
        );

        this.halfPitch = 1.57079632679;

        // Listen for move events from the map and update the Three.js camera. Some attributes only change when viewport resizes, so update those accordingly
        this.updateCameraBound = () => this.updateCamera();
        this.map.on('move', this.updateCameraBound);
        this.setupCameraBound = () => this.setupCamera();
        this.map.on('resize', this.setupCameraBound);
        //this.map.on('moveend', ()=>this.updateCallback())

        this.setupCamera();
    }

    detachCamera() {
        this.map.off('move', this.updateCameraBound);
        this.map.off('resize', this.setupCameraBound);
        this.updateCallback = null;
        this.map = null;
        this.camera = null;
    }

    setupCamera() {
        var t = this.map.transform;
        const halfFov = this.state.fov / 2;
        var cameraToCenterDistance = (0.5 / Math.tan(halfFov)) * t.height;

        this.state.cameraToCenterDistance = cameraToCenterDistance;
        this.state.cameraTranslateZ = new THREE.Matrix4().makeTranslation(0, 0, cameraToCenterDistance);

        this.updateCamera();
    }

    updateCamera(ev) {
        if (!this.camera) {
            console.log('nocamera');
            return;
        }

        var t = this.map.transform;

        // Recalculate pitch when going past 90 degrees to fix groundangle and distance
        var pitch = t._pitch > this.halfPitch ? this.halfPitch - (t._pitch - this.halfPitch) : t._pitch;

        var halfFov = this.state.fov / 2;
        const groundAngle = Math.PI / 2 + pitch;
        this.state.topHalfSurfaceDistance =
            (Math.sin(halfFov) * this.state.cameraToCenterDistance) / Math.sin(Math.PI - groundAngle - halfFov);

        // Calculate z distance of the farthest fragment that should be rendered.
        const furthestDistance =
            Math.cos(Math.PI / 2 - pitch) * this.state.topHalfSurfaceDistance + this.state.cameraToCenterDistance;

        // Add a bit extra to avoid precision problems when a fragment's distance is exactly `furthestDistance`
        const farZ = furthestDistance * 1.01;

        this.camera.aspect = t.width / t.height;
        this.camera.projectionMatrix = this.makePerspectiveMatrix(this.state.fov, t.width / t.height, 1, farZ);

        var cameraWorldMatrix = new THREE.Matrix4();
        var rotatePitch = new THREE.Matrix4().makeRotationX(t._pitch);
        var rotateBearing = new THREE.Matrix4().makeRotationZ(t.angle);

        // Unlike the Mapbox GL JS camera, separate camera translation and rotation out into its world matrix
        // If this is applied directly to the projection matrix, it will work OK but break raycasting

        cameraWorldMatrix.premultiply(this.state.cameraTranslateZ).premultiply(rotatePitch).premultiply(rotateBearing);

        this.camera.matrixWorld.copy(cameraWorldMatrix);

        // Handle scaling and translation of objects in the map in the world's matrix transform, not the camera
        let zoomPow = t.scale * this.state.worldSizeRatio;
        let scale = new THREE.Matrix4();
        scale.makeScale(zoomPow, zoomPow, zoomPow);
        //console.log(`zoomPow: ${zoomPow}`);

        let translateMap = new THREE.Matrix4();
        translateMap.makeTranslation(-t.point.x, t.point.y, 0);

        this.world.matrix = new THREE.Matrix4();
        this.world.matrix
            //.premultiply(rotateMap)
            .premultiply(this.state.translateCenter)
            .premultiply(scale)
            .premultiply(translateMap);

        // Threejs > 119
        /* let matrixWorldInverse = new THREE.Matrix4();
         matrixWorldInverse.copy(this.world.matrix).invert();
 
         let projectionMatrixInverse = new THREE.Matrix4();
         projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();
 
         let cameraMatrixWorldInverse = new THREE.Matrix4();
         cameraMatrixWorldInverse.copy(this.camera.matrixWorld).invert();
 
 
         this.camera.projectionMatrixInverse = projectionMatrixInverse;
         this.camera.matrixWorldInverse = cameraMatrixWorldInverse;
         this.frustum = new THREE.Frustum();
         this.frustum.setFromProjectionMatrix(
             new THREE.Matrix4().multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse)
         );
 
         this.cameraPosition = new THREE.Vector3(0, 0, 0).unproject(this.camera).applyMatrix4(matrixWorldInverse);
         */
        // Threejs < 120
        let matrixWorldInverse = new THREE.Matrix4();
        matrixWorldInverse.getInverse(this.world.matrix);

        this.camera.projectionMatrixInverse.getInverse(this.camera.projectionMatrix);
        this.camera.matrixWorldInverse.getInverse(this.camera.matrixWorld);
        this.frustum = new THREE.Frustum();
        this.frustum.setFromProjectionMatrix(
            new THREE.Matrix4().multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse)
        );

        this.cameraPosition = new THREE.Vector3(0, 0, 0).unproject(this.camera).applyMatrix4(matrixWorldInverse);

        if (this.updateCallback) {
            // this.updateCallback();

            // time: experimental - only update after zoom/pan is done.
            if(this.timeoutHandle){
                window.clearTimeout(this.timeoutHandle);
            }

            this.timeoutHandle = window.setTimeout(() => { this.updateCallback() }, 1000);
        }
    }

    makePerspectiveMatrix(fovy, aspect, near, far) {
        let out = new THREE.Matrix4();
        let f = 1.0 / Math.tan(fovy / 2),
            nf = 1 / (near - far);

        let newMatrix = [f / aspect, 0, 0, 0,
            0, f, 0, 0,
            0, 0, (far + near) * nf, -1,
            0, 0, 2 * far * near * nf, 0];

        out.elements = newMatrix;
        return out;
    }
}

export default CameraSync;
