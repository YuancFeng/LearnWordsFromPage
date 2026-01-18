import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';

// Chrome 扩展需要特殊的构建配置
// content script 和 background 都需要是独立的 IIFE 文件

// Process polyfill - 在浏览器环境中提供 process 对象
const processPolyfill = `
if (typeof globalThis.process === 'undefined') {
  globalThis.process = {
    env: { NODE_ENV: 'production' },
    nextTick: function(cb) { setTimeout(cb, 0); },
    emit: function() {},
    on: function() {},
    once: function() {},
    off: function() {},
    removeListener: function() {},
    listeners: function() { return []; },
    version: '',
    versions: {},
    platform: 'browser',
    browser: true
  };
}
`;

export default defineConfig(({ mode }) => {
  // 默认构建所有文件
  const buildTarget = process.env.BUILD_TARGET;

  // 共享的 define 配置 - 确保所有 process.env 引用都被替换
  const sharedDefine = {
    // 关键：替换所有 process.env 引用，避免浏览器中 "process is not defined" 错误
    'process.env.NODE_ENV': '"production"',
    'process.env.API_KEY': '""',
    'process.env.GEMINI_API_KEY': '""',
  };

  // 共享的基础配置
  const baseConfig = {
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
    define: sharedDefine,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    base: './',
  };

  // 根据 BUILD_TARGET 返回不同的配置
  if (buildTarget === 'content') {
    // 单独构建 content script 为 IIFE
    return {
      ...baseConfig,
      // 强制生产模式以确保 React 使用生产版本
      mode: 'production',
      define: sharedDefine,
      build: {
        outDir: 'dist',
        emptyOutDir: false,
        minify: 'esbuild',
        lib: {
          entry: path.resolve(__dirname, 'src/content/index.ts'),
          name: 'LingoRecallContent',
          formats: ['iife'],
          fileName: () => 'content.js',
        },
        rollupOptions: {
          output: {
            // IIFE 不需要 exports
            extend: true,
            // 确保没有外部依赖
            inlineDynamicImports: true,
            // 在输出文件开头注入 process polyfill
            banner: processPolyfill,
          },
        },
      },
    };
  }

  if (buildTarget === 'background') {
    // 单独构建 background 主脚本 (background-main.js)
    return {
      ...baseConfig,
      mode: 'production',
      define: sharedDefine,
      build: {
        outDir: 'dist',
        emptyOutDir: false,
        minify: 'esbuild',
        lib: {
          entry: path.resolve(__dirname, 'src/background/index.ts'),
          name: 'LingoRecallBackground',
          formats: ['iife'],
          fileName: () => 'background-main.js',
        },
        rollupOptions: {
          output: {
            inlineDynamicImports: true,
            // 在输出文件开头注入 process polyfill
            banner: processPolyfill,
          },
        },
      },
    };
  }

  if (buildTarget === 'sw-wrapper') {
    // 构建 Service Worker wrapper 脚本 (background.js)
    // 这个 wrapper 提供更好的错误处理和调试能力
    return {
      ...baseConfig,
      mode: 'production',
      define: sharedDefine,
      build: {
        outDir: 'dist',
        emptyOutDir: false,
        minify: 'esbuild',
        lib: {
          entry: path.resolve(__dirname, 'src/background/sw-wrapper.ts'),
          name: 'LingoRecallSWWrapper',
          formats: ['iife'],
          fileName: () => 'background.js',
        },
        rollupOptions: {
          output: {
            inlineDynamicImports: true,
          },
        },
      },
    };
  }

  // 默认：构建 popup 和 options (可以使用 ESM)
  return {
    ...baseConfig,
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        input: {
          popup: path.resolve(__dirname, 'popup.html'),
          options: path.resolve(__dirname, 'options.html'),
        },
        output: {
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },
    },
  };
});
