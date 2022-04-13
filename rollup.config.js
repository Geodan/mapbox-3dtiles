import { nodeResolve } from '@rollup/plugin-node-resolve';
import serve from 'rollup-plugin-serve';

export default {
    input: ['./modules/Mapbox3DTiles.mjs'],
    output: [
        {
            name: 'Mapbox3DTiles',
            file: './index.js',
            format: 'es',
            sourcemap: true
        },
        {
            name: 'Mapbox3DTiles',
            file: './dist/Mapbox3DTiles.js',
            format: 'iife',
            sourcemap: true
        },
        {
            name: 'Mapbox3DTiles',
            file: './umd/Mapbox3DTiles.js',
            format: 'umd',
            sourcemap: false
        }
    ],
    plugins: [nodeResolve(), process.env.WEBDEVSERVER ? serve({ port: 8082 }) : null]
};
