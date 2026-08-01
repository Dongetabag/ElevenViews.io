/// <reference types="vite/client" />

// Everything Vite exposes here is compiled into browser-delivered JS and is
// therefore public. Only non-secret configuration belongs in this interface.
// Credentials go server-side and are reached through services/serverProxy.ts.
// vite.config.ts fails the build if a secret-shaped VITE_ variable is set.
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  /** Publishable key. Access is enforced by row-level security, safe to ship. */
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_APP_URL: string;
  readonly VITE_MCP_URL: string;
  readonly VITE_AISIM_MCP_URL: string;
  readonly VITE_AGENT_API_URL: string;
  readonly VITE_N8N_API_URL: string;
  readonly VITE_BASEROW_API_URL: string;
  readonly VITE_BASEROW_TABLE_ID: string;
  readonly VITE_WASABI_BUCKET: string;
  readonly VITE_WASABI_REGION: string;
  readonly VITE_BOX_CLIENT_ID: string;
  readonly VITE_BOX_REDIRECT_URI: string;
  readonly VITE_VORTEX_API_URL: string;
  readonly VITE_N8N_WEBHOOK_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
