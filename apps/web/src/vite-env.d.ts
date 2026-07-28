/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_NAVER_MAP_CLIENT_ID: string;
  readonly VITE_ENABLE_DEV_ROUTES?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
