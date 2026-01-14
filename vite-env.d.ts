/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_GEMINI_API_KEY: string;
  readonly VITE_OPENAI_API_KEY: string;
  readonly VITE_WASABI_ACCESS_KEY: string;
  readonly VITE_WASABI_SECRET_KEY: string;
  readonly VITE_WASABI_BUCKET: string;
  readonly VITE_WASABI_REGION: string;
  readonly VITE_WASABI_ENDPOINT: string;
  readonly VITE_BOX_CLIENT_ID: string;
  readonly VITE_BOX_CLIENT_SECRET: string;
  readonly VITE_BOX_REDIRECT_URI: string;
  readonly VITE_BASEROW_URL: string;
  readonly VITE_BASEROW_API_TOKEN: string;
  readonly VITE_BASEROW_DATABASE_ID: string;
  readonly VITE_DISCORD_WEBHOOK_URL: string;
  readonly VITE_AR_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
