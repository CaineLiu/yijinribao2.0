
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // 允许在前端代码中使用 process.env.API_KEY，且回退到空字符串防止 crash
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || '')
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    sourcemap: false
  },
  server: {
    port: 3000,
    host: true
  }
});
