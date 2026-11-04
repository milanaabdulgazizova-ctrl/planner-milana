import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Сайт живёт по адресу https://milanaabdulgazizova-ctrl.github.io/planner-milana/
export default defineConfig({
  base: '/planner-milana/',
  build: { chunkSizeWarningLimit: 800 },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png', 'icons/favicon.svg'],
      manifest: {
        name: 'Планер',
        short_name: 'Планер',
        description: 'Личный планер Миланы',
        lang: 'ru',
        start_url: '/planner-milana/',
        scope: '/planner-milana/',
        display: 'standalone',
        background_color: '#EDF1EA',
        theme_color: '#EDF1EA',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // страница проверки сервисов не должна попадать в офлайн-кэш приложения
        globIgnores: ['check/**'],
        navigateFallbackDenylist: [/\/check\//],
      },
    }),
  ],
});
