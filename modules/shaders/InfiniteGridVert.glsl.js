export default `
    varying vec3 worldPosition;
    varying vec3 camPosition;

    uniform vec3 uMapCenterWorld;
    uniform vec3 uMapCameraWorld;
    uniform vec3 uOrigin;
    uniform float uDistance;

    void main() {
        vec3 camDiff = vec3(uOrigin.x - uMapCameraWorld.x, uOrigin.y - uMapCameraWorld.y, uOrigin.z - uMapCameraWorld.z);
        camPosition.xy -= camDiff.xy;

        vec3 pos = position.xyz * uDistance;
        vec3 diff = vec3(uOrigin.x - uMapCenterWorld.x, uOrigin.y - uMapCenterWorld.y, uOrigin.z - uMapCenterWorld.z);
        pos.xy -= diff.xy;

        worldPosition = pos;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
`;
