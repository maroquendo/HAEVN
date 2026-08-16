import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function pwaAssetInjectorPlugin() {
  return {
    name: 'pwa-asset-injector',
    closeBundle() {
      const distDir = path.resolve(__dirname, 'dist');
      const swPath = path.resolve(distDir, 'sw.js');
      
      if (!fs.existsSync(swPath)) {
        console.warn('dist/sw.js not found, skipping asset injection');
        return;
      }
      
      // Get all files recursively under dist/assets
      const assetsDir = path.resolve(distDir, 'assets');
      let assetUrls: string[] = [];
      
      if (fs.existsSync(assetsDir)) {
        const files = fs.readdirSync(assetsDir);
        assetUrls = files.map(file => `./assets/${file}`);
      }
      
      // Standard urls to cache
      const coreUrls = [
        './',
        './index.html',
        './manifest.json',
        './apple-touch-icon.png'
      ];
      
      const allUrlsToCache = [...coreUrls, ...assetUrls];
      
      let swContent = fs.readFileSync(swPath, 'utf-8');
      
      const urlsArrayStr = `const urlsToCache = [\n  ${allUrlsToCache.map(url => `'${url}'`).join(',\n  ')}\n];`;
      
      // Regex to match the urlsToCache array
      const regex = /const urlsToCache = \[\s*[^\]]*\s*\];/;
      if (regex.test(swContent)) {
        swContent = swContent.replace(regex, urlsArrayStr);
        fs.writeFileSync(swPath, swContent, 'utf-8');
        console.log('Successfully injected PWA assets into dist/sw.js:', allUrlsToCache);
      } else {
        console.warn('Could not find urlsToCache array in sw.js to replace');
      }
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: './', // Important for Capacitor - use relative paths
    build: {
      outDir: 'dist',
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react(), pwaAssetInjectorPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
      dedupe: ['react', 'react-dom'],
    }
  };
});
