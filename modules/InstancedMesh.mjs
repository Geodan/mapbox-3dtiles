import * as THREE from 'three';
import { LatToScale, YToLat } from './Utils.mjs';

export async function IMesh(inmesh, instancesParams, inverseMatrix) {
    /* intancesParams {
        positions: float32Array
        normalsRight?: float32Array
        normalsUp?: float32Array
        scales?: float32Array
        xyzScales?: float32 Array
    } */
    let matrix = new THREE.Matrix4();
    let position = new THREE.Vector3();
    let rotation = new THREE.Euler();
    let quaternion = new THREE.Quaternion();
    let scale = new THREE.Vector3();

    let geometry = inmesh.geometry;
    geometry.applyMatrix4(inmesh.matrixWorld); // apply world modifiers to geometry

    let material = inmesh.material;
    let instancedMesh = new THREE.InstancedMesh(geometry, material, instancesParams.positions.length / 3);
    instancedMesh.userData = inmesh.userData;

    for (let i = 0; i < instancesParams.positions.length; i += 3) {
        position = {
            x: instancesParams.positions[i] + inverseMatrix.elements[12],
            y: instancesParams.positions[i + 1] + inverseMatrix.elements[13],
            z: instancesParams.positions[i + 2] + inverseMatrix.elements[14]
        };
        if (instancesParams.normalsRight) {
            rotation.set(0, 0, Math.atan2(instancesParams.normalsRight[i + 1], instancesParams.normalsRight[i]));
            quaternion.setFromEuler(rotation);
        }
        scale.x = scale.y = scale.z = LatToScale(YToLat(instancesParams.positions[i + 1]));
        if (instancesParams.scales) {
            scale.x *= instancesParams.scales[i / 3];
            scale.y *= instancesParams.scales[i / 3];
            scale.z *= instancesParams.scales[i / 3];
        }
        if (instancesParams.xyzScales) {
            scale.x *= instancesParams.xyzScales[i];
            scale.y *= instancesParams.xyzScales[i + 1];
            scale.z *= instancesParams.xyzScales[i + 2];
        }
        matrix.compose(position, quaternion, scale);
        instancedMesh.setMatrixAt(i / 3, matrix);
    }

    return instancedMesh;
}
