import { DEFAULT_EXPORT_OPTIONS, loadExportOptions, saveExportOptions } from './exportOptions'

beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())

it('starts from the defaults when nothing was saved', () => {
  expect(loadExportOptions()).toEqual(DEFAULT_EXPORT_OPTIONS)
})

it('restores the options saved last time', () => {
  const options = { format: 'svg', scope: 'selection', background: false, darkMode: true, scale: 3, embedScene: true } as const
  saveExportOptions(options)
  expect(loadExportOptions()).toEqual(options)
})

it('embeds the editable data by default, but respects a saved choice not to', () => {
  expect(loadExportOptions().embedScene).toBe(true)
  saveExportOptions({ ...DEFAULT_EXPORT_OPTIONS, embedScene: false })
  expect(loadExportOptions().embedScene).toBe(false)
  saveExportOptions({ ...DEFAULT_EXPORT_OPTIONS, embedScene: true })
  expect(loadExportOptions().embedScene).toBe(true)
})

it('uses the default for an invalid saved embed choice', () => {
  localStorage.setItem('rabisco.exportOptions', JSON.stringify({ embedScene: 'yes' }))
  expect(loadExportOptions().embedScene).toBe(true)
})

it('replaces invalid saved values with the defaults, field by field', () => {
  localStorage.setItem('rabisco.exportOptions', JSON.stringify({ format: 'gif', scale: 7, darkMode: true }))
  expect(loadExportOptions()).toEqual({ ...DEFAULT_EXPORT_OPTIONS, darkMode: true })
})

it('ignores saved data that is not JSON', () => {
  localStorage.setItem('rabisco.exportOptions', '{oops')
  expect(loadExportOptions()).toEqual(DEFAULT_EXPORT_OPTIONS)
})

it('keeps working when storage is unavailable', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('blocked')
  })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked')
  })
  expect(() => saveExportOptions(DEFAULT_EXPORT_OPTIONS)).not.toThrow()
  expect(loadExportOptions()).toEqual(DEFAULT_EXPORT_OPTIONS)
})
