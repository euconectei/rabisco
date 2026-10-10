import { buildMultipart } from './multipart'

it('builds a multipart/related body with metadata and content parts', () => {
  const { body, contentType } = buildMultipart({ name: 'Mapa.excalidraw' }, '{"type":"excalidraw"}', 'application/vnd.excalidraw+json')
  const boundary = contentType.match(/^multipart\/related; boundary=(.+)$/)?.[1]
  expect(boundary).toBeTruthy()
  expect(body).toBe(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n{"name":"Mapa.excalidraw"}\r\n` +
      `--${boundary}\r\nContent-Type: application/vnd.excalidraw+json\r\n\r\n{"type":"excalidraw"}\r\n--${boundary}--`,
  )
})

it('never uses a boundary that appears inside the content', () => {
  const sneaky = Array.from({ length: 50 }, (_, i) => `rabisco-boundary-${i}`).join('\n')
  for (let run = 0; run < 20; run++) {
    const { body, contentType } = buildMultipart({}, sneaky, 'text/plain')
    const boundary = contentType.split('boundary=')[1]
    expect(sneaky.includes(boundary)).toBe(false)
    expect(body.split(`--${boundary}`)).toHaveLength(4)
  }
})
