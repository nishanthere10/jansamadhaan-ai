/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Opt-in flag for the dev-only instant-login panel (never read in production builds). */
  readonly VITE_DEV_AUTH_BYPASS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
