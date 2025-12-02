import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { HttpsProxyAgent } from 'https-proxy-agent';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    
    // Detect proxy from environment variables
    const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || 'http://127.0.0.1:7890'; // Fallback to common default
    const agent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;

    if (agent) {
        console.log(`[Vite Proxy] Using upstream proxy: ${proxyUrl}`);
    }

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api/poe': {
            target: 'https://api.poe.com/v1',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/poe/, ''),
            agent: agent, // Inject the proxy agent
            secure: false // Often needed when chaining proxies
          },
        },
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.POE_API_KEY': JSON.stringify(env.POE_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
