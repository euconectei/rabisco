export {}

declare global {
  /** App version from package.json, injected by Vite at build time. */
  const __APP_VERSION__: string

  interface Window {
    EXCALIDRAW_ASSET_PATH?: string
  }
}
