export default /* glsl */`
uniform vec3 colorA; 
uniform vec3 colorB;

varying mediump vec3 vNormal;

void main() {
    mediump vec3 dir = vec3(0.0, 1.0, 0.0);

    // ensure it's normalized
    dir = normalize(dir);

    // calculate the dot product of
    // the dir to the vertex normal
    mediump float dProd = max(0.0, dot(vNormal, dir));

    // feed into our frag colour
    //gl_FragColor = vec4(colorA * dProd);

    gl_FragColor = vec4(mix(colorA, colorB, dProd), 1.0);
}
`;