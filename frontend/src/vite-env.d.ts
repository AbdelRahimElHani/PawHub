/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend public origin, no trailing slash (Railway: same as your API service URL). */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
