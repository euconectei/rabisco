import type { Language } from '../i18n/languages'

export const GAPI_SCRIPT_URL = 'https://apis.google.com/js/api.js'
const PICKABLE_MIME_TYPES = 'application/vnd.excalidraw+json,application/json,application/octet-stream,text/plain'

interface PickerApi {
  PickerBuilder: new () => PickerBuilder
  DocsView: new (viewId?: string) => { setMode(mode: string): unknown; setMimeTypes(types: string): unknown }
  ViewId: { DOCS: string }
  DocsViewMode: { LIST: string }
  Action: { PICKED: string; CANCEL: string }
  Response: { ACTION: string; DOCUMENTS: string }
  Document: { ID: string; NAME: string }
}

interface PickerBuilder {
  addView(view: unknown): PickerBuilder
  setOAuthToken(token: string): PickerBuilder
  setDeveloperKey(key: string): PickerBuilder
  setAppId(appId: string): PickerBuilder
  setLocale(locale: string): PickerBuilder
  setCallback(callback: (data: Record<string, unknown>) => void): PickerBuilder
  build(): { setVisible(visible: boolean): void }
}

let loading: Promise<PickerApi> | null = null

function loadPicker(): Promise<PickerApi> {
  loading ??= new Promise<PickerApi>((resolve, reject) => {
    const fail = () => {
      loading = null
      reject(new Error('Google Picker could not be loaded'))
    }
    const script = document.createElement('script')
    script.src = GAPI_SCRIPT_URL
    script.async = true
    script.addEventListener('error', fail)
    script.addEventListener('load', () => {
      const w = window as unknown as {
        gapi?: { load(name: string, options: { callback(): void; onerror(): void }): void }
        google?: { picker?: PickerApi }
      }
      if (!w.gapi) return fail()
      w.gapi.load('picker', {
        callback: () => (w.google?.picker ? resolve(w.google.picker) : fail()),
        onerror: fail,
      })
    })
    document.head.appendChild(script)
  })
  return loading
}

export function resetPickerLoaderForTests(): void {
  loading = null
}

export interface PickFileOptions {
  accessToken: string
  apiKey: string
  appId: string
  locale: Language
}

/** Opens Google's file picker; resolves with the chosen file, or null when cancelled. */
export async function pickFile(options: PickFileOptions): Promise<{ id: string; name: string } | null> {
  const picker = await loadPicker()
  return new Promise((resolve) => {
    const view = new picker.DocsView(picker.ViewId.DOCS)
    view.setMode(picker.DocsViewMode.LIST)
    // Files from excalidraw.com land in Drive with assorted types; Google Docs, videos etc. are hidden.
    view.setMimeTypes(PICKABLE_MIME_TYPES)
    new picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(options.accessToken)
      .setDeveloperKey(options.apiKey)
      .setAppId(options.appId)
      .setLocale(options.locale)
      .setCallback((data) => {
        const action = data[picker.Response.ACTION]
        if (action === picker.Action.CANCEL) return resolve(null)
        if (action !== picker.Action.PICKED) return
        const doc = (data[picker.Response.DOCUMENTS] as Array<Record<string, string>> | undefined)?.[0]
        resolve(doc ? { id: doc[picker.Document.ID], name: doc[picker.Document.NAME] } : null)
      })
      .build()
      .setVisible(true)
  })
}
