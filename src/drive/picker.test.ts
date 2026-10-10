import { GAPI_SCRIPT_URL, pickFile, resetPickerLoaderForTests } from './picker'

type PickerCallback = (data: Record<string, unknown>) => void

function installFakeGapi() {
  let callback: PickerCallback = () => {}
  const builder = {
    addView: vi.fn(() => builder),
    setOAuthToken: vi.fn(() => builder),
    setDeveloperKey: vi.fn(() => builder),
    setAppId: vi.fn(() => builder),
    setLocale: vi.fn(() => builder),
    setCallback: vi.fn((cb: PickerCallback) => {
      callback = cb
      return builder
    }),
    build: vi.fn(() => ({ setVisible: vi.fn() })),
  }
  const view = { setMode: vi.fn(() => view) }
  const w = window as unknown as Record<string, unknown>
  w.gapi = { load: vi.fn((_name: string, options: { callback: () => void }) => options.callback()) }
  w.google = {
    picker: {
      PickerBuilder: vi.fn(function PickerBuilder() {
        return builder
      }),
      DocsView: vi.fn(function DocsView() {
        return view
      }),
      ViewId: { DOCS: 'all' },
      DocsViewMode: { LIST: 'list' },
      Action: { PICKED: 'picked', CANCEL: 'cancel' },
      Response: { ACTION: 'action', DOCUMENTS: 'docs' },
      Document: { ID: 'id', NAME: 'name' },
    },
  }
  return { builder, view, answer: (data: Record<string, unknown>) => callback(data) }
}

const options = { accessToken: 'tok', apiKey: 'key', appId: '123', locale: 'pt-BR' as const }
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))
const loadScript = () => document.head.querySelector(`script[src="${GAPI_SCRIPT_URL}"]`)?.dispatchEvent(new Event('load'))

beforeEach(() => {
  resetPickerLoaderForTests()
  document.head.innerHTML = ''
})

it('opens the Picker with token, key, app id and locale, and returns the picked file', async () => {
  const fake = installFakeGapi()
  const picking = pickFile(options)
  loadScript()
  await flush()
  expect(fake.builder.setOAuthToken).toHaveBeenCalledWith('tok')
  expect(fake.builder.setDeveloperKey).toHaveBeenCalledWith('key')
  expect(fake.builder.setAppId).toHaveBeenCalledWith('123')
  expect(fake.builder.setLocale).toHaveBeenCalledWith('pt-BR')
  expect(fake.view.setMode).toHaveBeenCalledWith('list')
  fake.answer({ action: 'picked', docs: [{ id: 'f9', name: 'Mapa.excalidraw' }] })
  await expect(picking).resolves.toEqual({ id: 'f9', name: 'Mapa.excalidraw' })
})

it('returns null when the person cancels', async () => {
  const fake = installFakeGapi()
  const picking = pickFile(options)
  loadScript()
  await flush()
  fake.answer({ action: 'cancel' })
  await expect(picking).resolves.toBeNull()
})

it('ignores intermediate callbacks such as "loaded"', async () => {
  const fake = installFakeGapi()
  const picking = pickFile(options)
  loadScript()
  await flush()
  fake.answer({ action: 'loaded' })
  fake.answer({ action: 'picked', docs: [{ id: 'f1', name: 'A.excalidraw' }] })
  await expect(picking).resolves.toEqual({ id: 'f1', name: 'A.excalidraw' })
})

it('loads the Google API script only once', async () => {
  const fake = installFakeGapi()
  const first = pickFile(options)
  loadScript()
  await flush()
  fake.answer({ action: 'cancel' })
  await first
  const second = pickFile(options)
  await flush()
  fake.answer({ action: 'cancel' })
  await second
  expect(document.head.querySelectorAll(`script[src="${GAPI_SCRIPT_URL}"]`)).toHaveLength(1)
})
