import * as THREE from 'three';

import { ThreeboxConstants } from './Constants.mjs';

export function YToLat(Y) {
    return (Math.atan(Math.pow(Math.E, ((Y / 111319.490778) * Math.PI) / 180.0)) * 360.0) / Math.PI - 90.0;
}

export function LatToScale(lat) {
    return 1 / Math.cos((lat * Math.PI) / 180);
}

export function GetIntersectingObjects(camera, objects, width, height, x, y) {
    // scale position to a percentage of the screen's width and height
    const position = new THREE.Vector2();
    position.x = (x / width) * 2 - 1;
    position.y = 1 - (y / height) * 2;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(position, camera);
    let intersects = raycaster.intersectObjects(objects, true);

    return intersects;
}

export function GetModel(modelId, children) {
    for (let i = 0; i < children.length; i++) {
        const element = children[i];
        if (element.type === 'Group') {
            if (element.children) {
                const model = GetModel(modelId, element.children);
                if (model) {
                    return model;
                }
            }
        } else if (element.type === 'Mesh') {
            if (element.userData.b3dm === modelId) {
                return element.parent;
            }
        }
    }
}

export function projectedUnitsPerMeter(latitude) {
    let c = ThreeboxConstants;
    return Math.abs(c.WORLD_SIZE / Math.cos(c.DEG2RAD * latitude) / c.EARTH_CIRCUMFERENCE);
}

export function projectToWorld(coords) {
    // Spherical mercator forward projection, re-scaling to WORLD_SIZE
    let c = ThreeboxConstants;
    var projected = [
        c.MERCATOR_A * c.DEG2RAD * coords[0] * c.PROJECTION_WORLD_SIZE,
        c.MERCATOR_A * Math.log(Math.tan(Math.PI * 0.25 + 0.5 * c.DEG2RAD * coords[1])) * c.PROJECTION_WORLD_SIZE
    ];

    //z dimension, defaulting to 0 if not provided
    if (!coords[2]) {
        projected.push(0);
    } else {
        var pixelsPerMeter = projectedUnitsPerMeter(coords[1]);
        projected.push(coords[2] * pixelsPerMeter);
    }

    var result = new THREE.Vector3(projected[0], projected[1], projected[2]);

    return result;
}
