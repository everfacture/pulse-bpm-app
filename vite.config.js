import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    base: '/pulse-bpm-app/',
    root: 'src',
    build: {
        outDir: '../dist',
        emptyOutDir: true,
    },
    resolve: {
        alias: {
            'realtime-bpm-analyzer': path.resolve(__dirname, 'node_modules/realtime-bpm-analyzer/dist/dist/index.esm.js')
        }
    },
    plugins: [
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
            manifest: {
                name: 'Pulse BPM Detector',
                short_name: 'Pulse',
                description: 'Real-time ambient BPM detector',
                theme_color: '#0d0d12',
                background_color: '#0d0d12',
                display: 'standalone',
                icons: [
                    {
                        src: 'pwa-192x192.png',
                        sizes: '192x192',
                        type: 'image/png'
                    },
                    {
                        src: 'pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png'
                    },
                    {
                        src: 'pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any maskable'
                    }
                ]
            }
        })
    ]
});
