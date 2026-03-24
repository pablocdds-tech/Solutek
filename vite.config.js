import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import base44 from "@base44/vite-plugin"
import path from 'path'

// Vite Config for Vitaliano ERP (Full Integration)
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [
      base44({
        legacySDKImports: true,
        hmrNotifier: true,
        navigationNotifier: true,
        visualEditAgent: true,
        baseUrl: env.VITE_BASE44_APP_BASE_URL || 'https://vital-erp-go.base44.app'
      }),
      react(),
    ],
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});