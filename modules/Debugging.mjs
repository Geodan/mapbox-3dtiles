import * as THREE from 'three';

export const DebugColors = [
    new THREE.Color(0x605f8f),
    new THREE.Color(0xf3aa51),
    new THREE.Color(0xcee5d5),
    new THREE.Color(0xff3000),
    new THREE.Color(0xff8000),
    new THREE.Color(0x44975c),
    new THREE.Color(0xb7d3e9),
    new THREE.Color(0xff50a0),
    new THREE.Color(0xfc7572),
    new THREE.Color(0x465b73),
    new THREE.Color(0x0080ff),
    new THREE.Color(0xf1c3aa),
    new THREE.Color(0xffff00),
];

export function CreateDebugBox(transformation, box, color) {
    let geom = new THREE.BoxGeometry(box[3] * 2, box[7] * 2, box[11] * 2);
    let edges = new THREE.EdgesGeometry(geom);
    let line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: color }));
    line.applyMatrix4(transformation);
    
    return line;
}

export function CreateDebugLabel(transformation, height, distance, msg, color) {
    const spriteMaterial = MakeTextSprite(msg, color);
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(distance, distance, distance);
    sprite.applyMatrix4(transformation);
    sprite.position.set(sprite.position.x, sprite.position.y, height);
    sprite.position.set(sprite.position.x, sprite.position.y, height);

    return sprite;
}

export function CreateDebugLine(transformation, color) {
    const material = new THREE.LineBasicMaterial({
        color: color
    });

    const points = [];
    points.push(new THREE.Vector3(0, 0, 0));
    points.push(new THREE.Vector3(0, 0, 200));
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, material);
    line.applyMatrix4(transformation);

    return line;
}

export function ThreeColorToByte(color) {
    return Math.floor(color >= 1.0 ? 255 : color * 256.0);
}

export function MakeTextSprite(msg, color) {
    var fontface = "Arial";
    var fontsize = 22;
    var borderThickness = 4;
    var borderColor = { r: ThreeColorToByte(color.r), g: ThreeColorToByte(color.g), b: ThreeColorToByte(color.b), a: 1.0 };
    var backgroundColor = { r: 255, g: 255, b: 255, a: 1.0 };
    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');

    context.font = "Bold " + fontsize + "px " + fontface;

    // get size data (height depends only on font size)
    var metrics = context.measureText(msg);
    var textWidth = metrics.width;

    context.fillStyle = "rgba(" + backgroundColor.r + "," + backgroundColor.g + "," + backgroundColor.b + "," + backgroundColor.a + ")";
    context.strokeStyle = "rgba(" + borderColor.r + "," + borderColor.g + "," + borderColor.b + "," + borderColor.a + ")";
    context.lineWidth = borderThickness;
    RoundRect(context, borderThickness / 2, borderThickness / 2, textWidth + borderThickness, fontsize * 1.4 + borderThickness, 2);

    // text color
    context.fillStyle = "rgba(0, 0, 0, 1.0)";
    context.fillText(msg, borderThickness, fontsize + borderThickness);

    // canvas contents will be used for a texture
    var texture = new THREE.Texture(canvas)
    texture.minFilter = THREE.LinearFilter
    texture.needsUpdate = true;

    var spriteMaterial = new THREE.SpriteMaterial({ map: texture, color: 0xffffff, sizeAttenuation: true });
    return spriteMaterial;
}

export function RoundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
}
