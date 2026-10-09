import { createDriveClient, EXCALIDRAW_MIME, FOLDER_MIME } from './client'
import { classifyResponse } from './errors'
import type { DriveFetch } from './http'

const API = 'https://www.googleapis.com/drive/v3'
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3'
const meta = (over: Record<string, unknown> = {}) => ({ id: 'f1', name: 'Mapa.excalidraw', version: '7', modifiedTime: '2026-10-09T10:00:00Z', parents: ['folder'], ...over })

interface Call { method: string; url: string; body?: string; contentType?: string | null }

function fakeFetch(handler: (call: Call) => unknown) {
  const calls: Call[] = []
  const driveFetch: DriveFetch = async (url, init = {}) => {
    const call: Call = { method: init.method ?? 'GET', url, body: init.body as string | undefined, contentType: new Headers(init.headers).get('Content-Type') }
    calls.push(call)
    const result = handler(call)
    // Mirrors the real driveFetch: non-2xx responses become DriveErrors.
    if (result instanceof Response) {
      if (!result.ok) throw await classifyResponse(result)
      return result
    }
    return new Response(typeof result === 'string' ? result : JSON.stringify(result ?? {}), { status: 200 })
  }
  return { driveFetch, calls }
}

function memoryCache(initial: string | null = null) {
  let value = initial
  return { get: () => value, set: (id: string) => void (value = id) }
}

const FIELDS = 'fields=id%2Cname%2Cversion%2CmodifiedTime%2Cparents'

describe('ensureFolder', () => {
  it('reuses a cached folder that still exists', async () => {
    const { driveFetch, calls } = fakeFetch(() => ({ id: 'cached', trashed: false }))
    const client = createDriveClient(driveFetch, memoryCache('cached'))
    await expect(client.ensureFolder()).resolves.toBe('cached')
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([`GET ${API}/files/cached?fields=id%2Ctrashed`])
  })

  it('looks the folder up when the cached one is in the trash', async () => {
    const { driveFetch, calls } = fakeFetch((call) =>
      call.url.includes('/files/cached') ? { id: 'cached', trashed: true } : { files: [{ id: 'found' }] },
    )
    const cache = memoryCache('cached')
    await expect(createDriveClient(driveFetch, cache).ensureFolder()).resolves.toBe('found')
    const query = new URL(calls[1].url).searchParams.get('q')
    expect(query).toBe(`mimeType='${FOLDER_MIME}' and name='Rabisco' and trashed=false`)
    expect(cache.get()).toBe('found')
  })

  it('looks the folder up when the cached one is gone', async () => {
    const { driveFetch } = fakeFetch((call) =>
      call.url.includes('/files/cached') ? new Response(null, { status: 404 }) : { files: [{ id: 'found' }] },
    )
    await expect(createDriveClient(driveFetch, memoryCache('cached')).ensureFolder()).resolves.toBe('found')
  })

  it('creates the folder when there is none', async () => {
    const { driveFetch, calls } = fakeFetch((call) => (call.method === 'POST' ? { id: 'new-folder' } : { files: [] }))
    const cache = memoryCache()
    await expect(createDriveClient(driveFetch, cache).ensureFolder()).resolves.toBe('new-folder')
    const create = calls.find((c) => c.method === 'POST')!
    expect(create.url).toBe(`${API}/files?fields=id`)
    expect(JSON.parse(create.body!)).toEqual({ name: 'Rabisco', mimeType: FOLDER_MIME })
    expect(cache.get()).toBe('new-folder')
  })
})

it('lists only .excalidraw files, newest first as returned', async () => {
  const { driveFetch, calls } = fakeFetch(() => ({
    files: [meta({ id: 'a', name: 'B.EXCALIDRAW' }), meta({ id: 'b', name: 'notes.md' }), meta({ id: 'c', name: 'A.excalidraw' }), meta({ id: 'd', name: 'x.png' })],
  }))
  const files = await createDriveClient(driveFetch, memoryCache()).listFiles()
  expect(files.map((f) => f.id)).toEqual(['a', 'c'])
  const url = new URL(calls[0].url)
  expect(url.origin + url.pathname).toBe(`${API}/files`)
  expect(url.searchParams.get('q')).toBe(`trashed=false and mimeType!='${FOLDER_MIME}'`)
  expect(url.searchParams.get('orderBy')).toBe('modifiedTime desc')
  expect(url.searchParams.get('pageSize')).toBe('100')
})

it('creates a file with a multipart upload inside the folder', async () => {
  const { driveFetch, calls } = fakeFetch(() => meta())
  await createDriveClient(driveFetch, memoryCache()).createFile('Sem título.excalidraw', '{}', 'folder')
  expect(calls[0].method).toBe('POST')
  expect(calls[0].url).toBe(`${UPLOAD}/files?uploadType=multipart&${FIELDS}`)
  expect(calls[0].contentType).toMatch(/^multipart\/related; boundary=/)
  expect(calls[0].body).toContain(JSON.stringify({ name: 'Sem título.excalidraw', mimeType: EXCALIDRAW_MIME, parents: ['folder'] }))
})

it('reads metadata and content', async () => {
  const { driveFetch, calls } = fakeFetch((call) => (call.url.includes('alt=media') ? '{"type":"excalidraw"}' : meta()))
  const client = createDriveClient(driveFetch, memoryCache())
  await expect(client.getMeta('f1')).resolves.toEqual(meta())
  await expect(client.download('f1')).resolves.toBe('{"type":"excalidraw"}')
  expect(calls.map((c) => c.url)).toEqual([`${API}/files/f1?${FIELDS}`, `${API}/files/f1?alt=media`])
})

it('saves content with the thumbnail hint, or empty metadata without one', async () => {
  const { driveFetch, calls } = fakeFetch(() => meta({ version: '8' }))
  const client = createDriveClient(driveFetch, memoryCache())
  const saved = await client.save('f1', '{"v":2}', { image: 'abc_-', mimeType: 'image/png' })
  expect(saved.version).toBe('8')
  expect(calls[0].method).toBe('PATCH')
  expect(calls[0].url).toBe(`${UPLOAD}/files/f1?uploadType=multipart&${FIELDS}`)
  expect(calls[0].body).toContain(JSON.stringify({ contentHints: { thumbnail: { image: 'abc_-', mimeType: 'image/png' } } }))
  await client.save('f1', '{"v":3}')
  expect(calls[1].body).toContain('\r\n{}\r\n')
})

it('renames, adding the extension only when missing', async () => {
  const { driveFetch, calls } = fakeFetch(() => meta())
  const client = createDriveClient(driveFetch, memoryCache())
  await client.rename('f1', 'Mapa')
  await client.rename('f1', 'Mapa.excalidraw')
  await client.rename('f1', '  Plano.EXCALIDRAW ')
  expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual(Array(3).fill(`PATCH ${API}/files/f1?${FIELDS}`))
  expect(calls.map((c) => JSON.parse(c.body!).name)).toEqual(['Mapa.excalidraw', 'Mapa.excalidraw', 'Plano.EXCALIDRAW'])
})

it('creates a sibling file in the same folder as another file', async () => {
  const { driveFetch, calls } = fakeFetch((call) => (call.method === 'GET' ? meta({ parents: ['p9'] }) : meta({ id: 'png' })))
  const created = await createDriveClient(driveFetch, memoryCache()).createSibling('Mapa (cópia).excalidraw', '{}', EXCALIDRAW_MIME, 'f1')
  expect(created.id).toBe('png')
  expect(calls[1].body).toContain(JSON.stringify({ name: 'Mapa (cópia).excalidraw', mimeType: EXCALIDRAW_MIME, parents: ['p9'] }))
})
