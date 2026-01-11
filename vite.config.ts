import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig(() => {
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      viteStaticCopy({
        targets: [
          {
            src: 'public/manifest.json',
            dest: '.',
          },
          {
            src: 'public/icons/*',
            dest: 'icons',
          },
        ],
      }),
    ],
    define: {
      'process.env.API_KEY': '""',
      'process.env.GEMINI_API_KEY': '""',
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    base: './',  // Use relative paths for Chrome extension
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        input: {
          popup: path.resolve(__dirname, 'popup.html'),
          content: path.resolve(__dirname, 'src/content/index.ts'),
          background: path.resolve(__dirname, 'src/background/index.ts'),
        },
        output: {
          entryFileNames: (chunkInfo) => {
            // content.js and background.js without hash for manifest reference
            if (chunkInfo.name === 'content' || chunkInfo.name === 'background') {
              return '[name].js';
            }
            return 'assets/[name]-[hash].js';
          },
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },
    },
  };
});
