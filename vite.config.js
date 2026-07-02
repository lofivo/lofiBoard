import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('/node_modules/')) return undefined;
          if (id.includes('/react/') || id.includes('/react-dom/')) return 'vendor-react';
          if (id.includes('/konva/')) return 'vendor-konva';
          if (id.includes('/@douyinfe/')) return 'vendor-semi';
          if (id.includes('/katex/')) return 'vendor-katex';
          if (id.includes('/lucide-static/')) return 'vendor-icons';
          if (id.includes('/html2canvas/')) return 'vendor-html2canvas';
          return 'vendor';
        },
      },
    },
  },
  resolve: {
    alias: [
      {
        find: /^@douyinfe\/semi-ui$/,
        replacement: fileURLToPath(new URL('./src/vendor/semi-ui.js', import.meta.url)),
      },
    ],
    extensions: ['.js', '.jsx', '.json'],
  },
});
