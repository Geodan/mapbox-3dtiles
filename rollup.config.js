import { nodeResolve } from '@rollup/plugin-node-resolve';
import serve from 'rollup-plugin-serve'

export default {
    input: ['./modules/Mapbox3DTiles.mjs'],
    output: {
        name: 'Mapbox3DTiles',
        file: './dist/Mapbox3DTiles.js',
        format: 'iife',
        sourcemap: true
    },
    plugins: [nodeResolve(), process.env.WEBDEVSERVER ? serve({port:8082}):null]
};
