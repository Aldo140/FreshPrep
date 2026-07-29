import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';

/**
 * GitHub Pages serves static files only — it never rewrites an unknown path to
 * index.html, so a client-side route 404s on a direct visit or refresh. Copying
 * the built index.html to 404.html makes Pages serve the app for any unmatched
 * path, and main.tsx then picks the view from window.location.pathname.
 *
 * /codefinder/ additionally gets a real build input (see rollupOptions.input)
 * so the common case resolves with a 200 rather than relying on this fallback.
 */
function githubPagesSpaFallback(): Plugin {
  return {
    name: 'github-pages-spa-fallback',
    apply: 'build',
    closeBundle() {
      const dist = path.resolve(__dirname, 'dist');
      const index = path.join(dist, 'index.html');
      if (fs.existsSync(index)) {
        fs.copyFileSync(index, path.join(dist, '404.html'));
      }
    },
  };
}

export default defineConfig(() => {
  return {
    base: process.env.NODE_ENV === 'production' ? '/FreshPrep/' : '/',
    plugins: [react(), tailwindcss(), githubPagesSpaFallback()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          codefinder: path.resolve(__dirname, 'codefinder/index.html'),
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
