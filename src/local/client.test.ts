import { IDBFactory, IDBObjectStore } from 'fake-indexeddb'
import { DriveError } from '../drive/errors'
import { createLocalDriveClient, LOCAL_FOLDER_ID, type LocalDriveClient } from './client'
import { closeLocalDb, runTx, request } from './db'
import { isLocalId } from './ids'

// 1x1 transparent PNG, URL-safe base64 as the editor's thumbnail renderer produces it.
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAHnOcZQAAAABJRU5ErkJggg'
const PNG_URL = `data:image/png;base64,${PNG}==`

let client: LocalDriveClient

beforeEach(async () => {
  await closeLocalDb()
  globalThis.indexedDB = new IDBFactory()
  client = createLocalDriveClient()
})

afterEach(() => vi.restoreAllMocks())

async function failure(promise: Promise<unknown>): Promise<DriveError> {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  )
  expect(error).toBeInstanceOf(DriveError)
  return error as DriveError
}

async function tamper(id: string, change: (meta: Record<string, unknown>) => unknown) {
  await runTx('readwrite', async ({ meta }) => {
    const row = (await request(meta.get(id))) as Record<string, unknown>
    await request(meta.put(change(row)))
  })
}

describe('ensureFolder', () => {
  it('answers with the fixed local folder', async () => {
    await expect(client.ensureFolder()).resolves.toBe(LOCAL_FOLDER_ID)
    expect(LOCAL_FOLDER_ID).toBe('local')
  })
})

describe('createFile and getMeta', () => {
  it('creates a drawing with a local id, the .excalidraw extension and version 1', async () => {
    const meta = await client.createFile('Plano', '{"a":1}', 'local')
    expect(isLocalId(meta.id)).toBe(true)
    expect(meta.name).toBe('Plano.excalidraw')
    expect(meta.version).toBe('1')
    expect(meta.headRevisionId).toBeTruthy()
    expect(Number.isNaN(Date.parse(meta.modifiedTime))).toBe(false)
    await expect(client.getMeta(meta.id)).resolves.toEqual(meta)
  })

  it('does not double the extension', async () => {
    const meta = await client.createFile('Plano.excalidraw', '{}', 'local')
    expect(meta.name).toBe('Plano.excalidraw')
  })

  it('throws notFound for an unknown id', async () => {
    expect((await failure(client.getMeta('local-nope'))).kind).toBe('notFound')
  })
})

describe('download', () => {
  it('returns the stored scene exactly', async () => {
    const content = '{"type":"excalidraw","elements":[{"id":"a"}]}'
    const { id } = await client.createFile('A', content, 'local')
    await expect(client.download(id)).resolves.toBe(content)
  })

  it('throws notFound for an unknown id', async () => {
    expect((await failure(client.download('local-nope'))).kind).toBe('notFound')
  })

  it('refuses stored content that is not text', async () => {
    const { id } = await client.createFile('A', '{}', 'local')
    await runTx('readwrite', async ({ content }) => {
      await request(content.put({ id, content: 42 }))
    })
    expect((await failure(client.download(id))).kind).toBe('invalidFile')
  })
})

describe('save', () => {
  it('replaces the content, bumps the version and issues a new revision every time', async () => {
    const created = await client.createFile('A', '{"v":1}', 'local')
    const first = await client.save(created.id, '{"v":2}')
    const second = await client.save(created.id, '{"v":2}')
    expect(first.version).toBe('2')
    expect(second.version).toBe('3')
    expect(new Set([created.headRevisionId, first.headRevisionId, second.headRevisionId]).size).toBe(3)
    await expect(client.download(created.id)).resolves.toBe('{"v":2}')
  })

  it('throws notFound for an id that does not exist and does not create it', async () => {
    expect((await failure(client.save('local-gone', '{}'))).kind).toBe('notFound')
    await expect(client.listFiles()).resolves.toEqual([])
  })

  it('stores the thumbnail as a PNG data URL, shown by listFiles only', async () => {
    const { id } = await client.createFile('A', '{}', 'local')
    const saved = await client.save(id, '{}', { image: PNG, mimeType: 'image/png' })
    expect(saved.thumbnailLink).toBeUndefined()
    const [listed] = await client.listFiles()
    expect(listed.thumbnailLink).toBe(PNG_URL)
  })

  it('keeps the previous thumbnail when a save sends none', async () => {
    const { id } = await client.createFile('A', '{}', 'local')
    await client.save(id, '{}', { image: PNG, mimeType: 'image/png' })
    await client.save(id, '{"b":1}')
    expect((await client.listFiles())[0].thumbnailLink).toBe(PNG_URL)
  })

  it('ignores a thumbnail that is not base64 PNG data, without failing the save', async () => {
    const { id } = await client.createFile('A', '{}', 'local')
    await client.save(id, '{"b":1}', { image: 'javascript:alert(1)', mimeType: 'image/png' })
    expect((await client.listFiles())[0].thumbnailLink).toBeUndefined()
    await expect(client.download(id)).resolves.toBe('{"b":1}')
  })

  it('writes meta and content in the same transaction: a failed write leaves both untouched', async () => {
    const { id } = await client.createFile('A', '{"v":1}', 'local')
    const before = await client.getMeta(id)
    const put = IDBObjectStore.prototype.put
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (this: IDBObjectStore, value: unknown) {
      // The meta store is written first; refuse the content store, as a full disk would.
      if (this.name === 'content') throw new DOMException('quota', 'QuotaExceededError')
      return put.call(this, value)
    })
    const error = await failure(client.save(id, '{"v":2}'))
    expect(error.kind).toBe('unknown')
    vi.restoreAllMocks()
    await expect(client.getMeta(id)).resolves.toEqual(before)
    await expect(client.download(id)).resolves.toBe('{"v":1}')
  })
})

describe('rename', () => {
  it('renames, adds the extension once, bumps the version but not the content revision', async () => {
    const created = await client.createFile('Velho', '{}', 'local')
    const renamed = await client.rename(created.id, 'Novo')
    expect(renamed.name).toBe('Novo.excalidraw')
    const again = await client.rename(created.id, 'Outro.excalidraw')
    expect(again.name).toBe('Outro.excalidraw')
    expect(again.version).toBe('3')
    expect(again.headRevisionId).toBe(created.headRevisionId)
  })

  it('throws notFound for an unknown id', async () => {
    expect((await failure(client.rename('local-nope', 'X'))).kind).toBe('notFound')
  })
})

describe('listFiles', () => {
  it('lists the most recently changed first, like Drive', async () => {
    const a = await client.createFile('A', '{}', 'local')
    const b = await client.createFile('B', '{}', 'local')
    const c = await client.createFile('C', '{}', 'local')
    expect((await client.listFiles()).map((f) => f.id)).toEqual([c.id, b.id, a.id])
    await client.save(a.id, '{"x":1}')
    expect((await client.listFiles()).map((f) => f.id)).toEqual([a.id, c.id, b.id])
    await client.rename(b.id, 'B2')
    expect((await client.listFiles()).map((f) => f.id)).toEqual([b.id, a.id, c.id])
  })

  it('lists only .excalidraw drawings', async () => {
    const a = await client.createFile('A', '{}', 'local')
    await client.createSibling('A.md', '# a', 'text/markdown', a.id)
    expect((await client.listFiles()).map((f) => f.name)).toEqual(['A.excalidraw'])
  })

  it('reports the local folder as the parent', async () => {
    await client.createFile('A', '{}', 'local')
    expect((await client.listFiles())[0].parents).toEqual(['local'])
  })

  it('skips malformed records instead of failing the whole list', async () => {
    const good = await client.createFile('Good', '{}', 'local')
    const bad = await client.createFile('Bad', '{}', 'local')
    const worse = await client.createFile('Worse', '{}', 'local')
    await tamper(bad.id, (m) => ({ ...m, name: undefined }))
    await tamper(worse.id, (m) => ({ ...m, version: 3, modifiedTime: 'not a date' }))
    expect((await client.listFiles()).map((f) => f.id)).toEqual([good.id])
    expect((await failure(client.getMeta(bad.id))).kind).toBe('invalidFile')
  })

  it.each([
    ['a javascript: URL', 'javascript:alert(1)'],
    ['an SVG data URL', 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='],
    ['a data URL with a script payload', 'data:image/png;base64,AAAA"><script>x</script>'],
    ['an oversized image', `data:image/png;base64,${'A'.repeat(1_000_001)}`],
    ['a non-string value', 12345],
  ])('drops only the thumbnail when it is %s', async (_label, thumbnail) => {
    const { id } = await client.createFile('A', '{}', 'local')
    await tamper(id, (m) => ({ ...m, thumbnail }))
    const [listed] = await client.listFiles()
    expect(listed.id).toBe(id)
    expect(listed.thumbnailLink).toBeUndefined()
  })

  it('rejects stored names that are absurdly long', async () => {
    const { id } = await client.createFile('A', '{}', 'local')
    await tamper(id, (m) => ({ ...m, name: 'x'.repeat(5000) }))
    await expect(client.listFiles()).resolves.toEqual([])
  })

  it('shortens very long names on write so they stay visible', async () => {
    const meta = await client.createFile('x'.repeat(3000), '{}', 'local')
    expect(meta.name.length).toBeLessThan(500)
    expect((await client.listFiles()).map((f) => f.id)).toEqual([meta.id])
  })
})

describe('createSibling', () => {
  it('creates a file next to the given one', async () => {
    const a = await client.createFile('Plano', '{}', 'local')
    const md = await client.createSibling('Plano.md', '# Plano', 'text/markdown', a.id)
    expect(md.name).toBe('Plano.md')
    expect(isLocalId(md.id)).toBe(true)
    await expect(client.download(md.id)).resolves.toBe('# Plano')
  })

  it('numbers a taken name "(2)", then "(3)"', async () => {
    const a = await client.createFile('Plano', '{}', 'local')
    const first = await client.createSibling('Plano.md', 'one', 'text/markdown', a.id)
    const second = await client.createSibling('Plano.md', 'two', 'text/markdown', a.id)
    const third = await client.createSibling('Plano.md', 'three', 'text/markdown', a.id)
    expect([first.name, second.name, third.name]).toEqual(['Plano.md', 'Plano (2).md', 'Plano (3).md'])
  })

  it('numbers names without an extension too', async () => {
    const a = await client.createFile('Plano', '{}', 'local')
    await client.createSibling('notas', 'one', 'text/plain', a.id)
    const second = await client.createSibling('notas', 'two', 'text/plain', a.id)
    expect(second.name).toBe('notas (2)')
  })

  it('keeps a binary file as bytes', async () => {
    const a = await client.createFile('Plano', '{}', 'local')
    const png = await client.createSibling('Plano.png', new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' }), 'image/png', a.id)
    expect(png.name).toBe('Plano.png')
    expect((await failure(client.download(png.id))).kind).toBe('invalidFile')
  })

  it('throws notFound when the neighbour does not exist', async () => {
    expect((await failure(client.createSibling('x.md', '', 'text/markdown', 'local-nope'))).kind).toBe('notFound')
  })
})

describe('storage failures', () => {
  it('reports a database that cannot be opened as an unknown error, never a network one', async () => {
    await closeLocalDb()
    vi.spyOn(indexedDB, 'open').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    const error = await failure(client.listFiles())
    expect(error.kind).toBe('unknown')
  })

  it('opens again once the browser lets it', async () => {
    await closeLocalDb()
    const open = vi.spyOn(indexedDB, 'open').mockImplementationOnce(() => {
      throw new Error('SecurityError')
    })
    await failure(client.listFiles())
    open.mockRestore()
    await expect(client.listFiles()).resolves.toEqual([])
  })

  it('reports a full disk on create as an unknown error and leaves the list intact', async () => {
    const kept = await client.createFile('Kept', '{}', 'local')
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })
    const error = await failure(client.createFile('New', '{}', 'local'))
    expect(error.kind).toBe('unknown')
    vi.restoreAllMocks()
    expect((await client.listFiles()).map((f) => f.id)).toEqual([kept.id])
  })

  it('reports missing IndexedDB support as an unknown error', async () => {
    await closeLocalDb()
    const original = globalThis.indexedDB
    // @ts-expect-error simulating a browser without IndexedDB
    delete globalThis.indexedDB
    try {
      expect((await failure(client.listFiles())).kind).toBe('unknown')
    } finally {
      globalThis.indexedDB = original
    }
  })
})

describe('movedTo', () => {
  it('is null until a Drive copy is recorded', async () => {
    const { id } = await client.createFile('A', '{}', 'local')
    await expect(client.movedTo(id)).resolves.toBeNull()
  })
})
