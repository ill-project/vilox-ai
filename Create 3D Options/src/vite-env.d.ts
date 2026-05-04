/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BINANCE_WS_URL: string
  readonly VITE_ENABLE_WEBSOCKET: string
  readonly VITE_COINGECKO_API_KEY: string
  readonly VITE_ALPHA_VANTAGE_KEY: string
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  // NOTE: Service role key is NOT a VITE_ var — it lives only in Edge Functions via Deno.env
  readonly VITE_ENABLE_REALTIME: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare function smartsupp(...args: unknown[]): void;
