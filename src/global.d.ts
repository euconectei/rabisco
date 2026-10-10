export {}

declare global {
  /** App version from package.json, injected by Vite at build time. */
  const __APP_VERSION__: string

  interface Window {
    EXCALIDRAW_ASSET_PATH?: string
    /** Test-only scene reader exposed by the E2E build (never present in production). */
    __rabiscoScene?: () => { elements: readonly unknown[]; selection: string[] }
    /** Test-only layout setter exposed by the E2E build (never present in production). */
    __rabiscoSetLayout?: (layout: 'both' | 'right' | 'free') => void
  }
}
