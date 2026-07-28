/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // 에뮬레이터(안드로이드 10.0.2.2)·시뮬레이터에서 접근하는 dev 라이브리로드용
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // dev 서버가 CORS(특히 OPTIONS preflight)를 허용하지 않아 브라우저에서 직접 호출할 수
    // 없다. dev 한정으로 같은 출처(/api/**)로 받아 BE 로 넘긴다 — 서버가 CORS 를 열면
    // 이 프록시와 .env.local 의 상대 경로 base URL 을 함께 걷어낸다.
    proxy: {
      '/api': {
        target: 'https://api-dev.everynook.co.kr',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
});
