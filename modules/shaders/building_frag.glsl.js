export default /* glsl */`


uniform vec3 colorA; 
uniform vec3 colorB;
uniform float height;

varying vec2 vUv;
varying mediump vec3 vNormal;
varying vec3 vertex;

varying float vHeight;

void main() {
    //mediump vec3 dir = vec3(0.5, 1.0, 0.0);

    // ensure it's normalized
    //dir = normalize(dir);

    // calculate the dot product of
    // the dir to the vertex normal
    //mediump float dProd = max(0.0, dot(vNormal, dir));

   // float dot_product = max(dot(normalize(dir), normalize(vNormal)), 0.0);

    // feed into our frag colour
    //gl_FragColor = vec4(colorA * dProd);

    //gl_FragColor = vec4(mix(colorA, colorB, dot_product), 1.0);

    float halfHeight = height * 0.5;
    float d = clamp((vHeight - (-halfHeight)) / height, 0., 1.);
    vec3 color = mix(colorA, colorB, d);
    vec4 diffuseColor = vec4( color, 1.0 );
    gl_FragColor = diffuseColor;
}
`;