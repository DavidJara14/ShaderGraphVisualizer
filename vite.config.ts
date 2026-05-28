import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  assetsInclude: ['**/*.shadergraph'],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
});
