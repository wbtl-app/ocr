import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: '../node_modules/tesseract.js/dist/worker.min.js',
          dest: 'tesseract'
        },
        {
          src: '../node_modules/tesseract.js-core/tesseract-core.wasm.js',
          dest: 'tesseract'
        },
        {
          src: '../lang-data/*.traineddata.gz',
          dest: 'tesseract/lang-data'
        }
      ]
    })
  ]
});
