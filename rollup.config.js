import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
    input: ['./modules/Mapbox3DTiles.mjs'],
    output: {
        name: 'Mapbox3DTiles',
        file: './dist/Mapbox3DTiles.js',
        format: 'iife',
        sourcemap: true
    },
    plugins: [nodeResolve()]
};
