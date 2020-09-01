export function YToLat(Y) {
    return (Math.atan(Math.pow(Math.E, ((Y / 111319.490778) * Math.PI) / 180.0)) * 360.0) / Math.PI - 90.0;
}

export function LatToScale(lat) {
    return 1 / Math.cos((lat * Math.PI) / 180);
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
