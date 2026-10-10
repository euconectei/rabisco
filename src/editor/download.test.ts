import { downloadBlob } from './download'

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

it('downloads the blob under the given name and frees the URL only afterwards', () => {
  vi.useFakeTimers()
  const createObjectURL = vi.fn(() => 'blob:fake')
  const revokeObjectURL = vi.fn()
  Object.assign(URL, { createObjectURL, revokeObjectURL })
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    expect(this.download).toBe('Mapa.png')
    expect(this.href).toBe('blob:fake')
  })
  const blob = new Blob(['x'], { type: 'image/png' })

  downloadBlob(blob, 'Mapa.png')

  expect(createObjectURL).toHaveBeenCalledWith(blob)
  expect(click).toHaveBeenCalledTimes(1)
  // Revoking right after click() cancels the download in some Safari/Firefox versions.
  expect(revokeObjectURL).not.toHaveBeenCalled()
  vi.runAllTimers()
  expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake')
})
