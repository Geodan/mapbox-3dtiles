export default `
    varying vec3 worldPosition;
    varying vec3 camPosition;

    uniform float uSize1;
    uniform float uSize2;
    uniform vec3 uColor;
    uniform float uDistance;

    float getGrid(float size) {
        vec2 r = worldPosition.xy / size;
        vec2 grid = abs(fract(r - 0.5) - 0.5) / fwidth(r);
        float line = min(grid.x, grid.y);
        
        return 1.0 - min(line, 1.0);
    }

    void main() {
        float d = 1.0 - min(distance(worldPosition.xyz, camPosition.xyz) / uDistance, 1.0);
        float g1 = getGrid(uSize1);
        float g2 = getGrid(uSize2);
        
        gl_FragColor = vec4(uColor.rgb, mix(g2, g1, g1) * pow(d, 3.0));
        gl_FragColor.a = mix(0.5 * gl_FragColor.a, gl_FragColor.a, g2);

        if ( gl_FragColor.a <= 0.0 ) discard;
    }
`;
