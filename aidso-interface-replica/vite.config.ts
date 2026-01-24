import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    // NOTE: Use a project-specific env name to avoid collisions with other projects/users
    // who might have set VITE_API_PROXY_TARGET in their global shell environment.
    const apiProxyTarget = env.AIDSO_API_PROXY_TARGET || 'http://localhost:3005';
    return {
      server: {
        port: 3002, // Frontend on 3002
        host: '0.0.0.0',
        proxy: {
          '/api': {
            target: apiProxyTarget,
            changeOrigin: true,
          }
        }
      },
      plugins: [
        react(),
        tailwindcss()
      ],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
