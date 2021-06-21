export default /* glsl */`
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vertex;

varying float vHeight;

void main() {
    vUv = uv;
    vNormal = normal;
    vertex = position;

    vHeight = position.y;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;