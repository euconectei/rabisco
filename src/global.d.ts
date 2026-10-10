export {}

declare global {
  /** App version from package.json, injected by Vite at build time. */
  const __APP_VERSION__: string

  interface Window {
    EXCALIDRAW_ASSET_PATH?: string
    /** Test-only scene reader exposed by the E2E build (never present in production). */
    __rabiscoScene?: () => {
      elements: readonly unknown[]
      selection: string[]
      scrollX: number
      scrollY: number
      zoom: number
      offsetLeft: number
      offsetTop: number
    }
    /** Test-only layout setter exposed by the E2E build (never present in production). */
    __rabiscoSetLayout?: (layout: 'both' | 'right' | 'free') => void
    /** Test-only style setter exposed by the E2E build (never present in production). */
    __rabiscoSetStyle?: (style: 'boxes' | 'lines') => void
    /** Test-only manual color setter exposed by the E2E build (never present in production). */
    __rabiscoSetColor?: (nodeId: string, strokeColor: string, backgroundColor: string) => void
  }
}
