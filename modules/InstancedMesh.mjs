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
    let positions = instancesParams.positions;
    let instanceCount = positions.length / 3;
    let instancedMesh = new THREE.InstancedMesh(geometry, material, instanceCount);
    instancedMesh.userData = inmesh.userData;

    for (let i = 0; i < instanceCount; i++) {
        position = {
            x: positions[i * 3] + inverseMatrix.elements[12],
            y: positions[i * 3 + 1] + inverseMatrix.elements[13],
            z: positions[i * 3 + 2] + inverseMatrix.elements[14]
        };
        if (instancesParams.normalsRight) {
            rotation.set(0, 0, Math.atan2(instancesParams.normalsRight[i * 3 + 1], instancesParams.normalsRight[i * 3]));
            quaternion.setFromEuler(rotation);
        }
        scale.x = scale.y = scale.z = LatToScale(YToLat(positions[i * 3 + 1]));
        if (instancesParams.scales) {
            scale.x *= instancesParams.scales[i];
            scale.y *= instancesParams.scales[i];
            scale.z *= instancesParams.scales[i];
        }
        if (instancesParams.xyzScales) {
            scale.x *= instancesParams.xyzScales[i * 3];
            scale.y *= instancesParams.xyzScales[i * 3 + 1];
            scale.z *= instancesParams.xyzScales[i * 3 + 2];
        }
        matrix.compose(position, quaternion, scale);
        instancedMesh.setMatrixAt(i, matrix);
    }

    return instancedMesh;
}
