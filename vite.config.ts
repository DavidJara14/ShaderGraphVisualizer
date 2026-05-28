import { defineConfig } from 'vite';

export default defineConfig({
  base: '/ShaderGraphVisualizer/',
  assetsInclude: ['**/*.shadergraph'],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
});
