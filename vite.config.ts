import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// Vite publishes every VITE_-prefixed variable into the client bundle, so any
// VITE_ name that looks like a credential is a published credential. Only
// values that are safe in a browser may carry a secret-shaped name.
const PUBLIC_BY_DESIGN = new Set([
  'VITE_SUPABASE_ANON_KEY', // publishable key, row-level security enforces access
]);

const SECRET_SHAPED = /(_KEY|_SECRET|_TOKEN|_PASSWORD|_WEBHOOK|_WEBHOOK_URL|_CREDENTIALS)$/;

function isSecretShaped(name: string): boolean {
  if (PUBLIC_BY_DESIGN.has(name)) return false;
  if (name.endsWith('_URL') && !name.includes('WEBHOOK')) return false;
  return SECRET_SHAPED.test(name);
}

// Fails the build rather than shipping a credential to browsers. This is the
// guard that makes the ELE-2620 leak non-recurring: even if someone re-adds a
// VITE_-prefixed credential to .env, `npm run build` stops here.
function blockPublishedSecrets(env: Record<string, string>): Plugin {
  return {
    name: 'ev-block-published-secrets',
    enforce: 'pre',
    buildStart() {
      const offenders = Object.keys(env)
        .filter((name) => name.startsWith('VITE_'))
        .filter(isSecretShaped)
        .filter((name) => (env[name] ?? '').trim() !== '');

      if (offenders.length > 0) {
        throw new Error(
          [
            '',
            'Build blocked: secret-shaped VITE_ variables would be compiled into browser-delivered JS.',
            '',
            ...offenders.map((name) => `  - ${name}`),
            '',
            'VITE_ variables are public. Move these to the server side and call them through',
            'a backend route (see services/serverProxy.ts), or drop the VITE_ prefix so the',
            'value stays server-only. If a value is genuinely safe to publish, add it to',
            'PUBLIC_BY_DESIGN in vite.config.ts with a comment explaining why.',
            '',
          ].join('\n'),
        );
      }
    },
  };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: '/portal/',

      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), blockPublishedSecrets(env)],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        outDir: 'dist',
        sourcemap: false,
        minify: 'esbuild',
      }
    };
});
