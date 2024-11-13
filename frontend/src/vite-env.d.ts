/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_WS_BASEURL: string;
  readonly VITE_API_BASEURL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
