import { nodeResolve } from '@rollup/plugin-node-resolve';
import serve from 'rollup-plugin-serve'

export default {
    input: ['./test//test.mjs'],
    output: {
        name: 'Mapbox3DTiles_test',
        file: './test/test.js',
        format: 'iife',
        sourcemap: true
    },
    plugins: [nodeResolve(), process.env.WEBDEVSERVER ? serve({port:8082}):null]
};