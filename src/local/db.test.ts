import { IDBFactory } from 'fake-indexeddb'
import { DriveError } from '../drive/errors'
import { createLocalDriveClient } from './client'
import { clearMoved, closeLocalDb, deleteIfUnchanged, LOCAL_DB_NAME, localDbExists, markMoved, nextTimestamp, readMovedTo, openLocalDb, parseContent, parseMeta, readRecord, runTx, request } from './db'

beforeEach(async () => {
  await closeLocalDb()
  globalThis.indexedDB = new IDBFactory()
})
afterEach(() => vi.restoreAllMocks())

const valid = { id: 'local-1', name: 'A.excalidraw', version: '1', headRevisionId: 'r1', modifiedTime: '2026-10-14T10:00:00.000Z' }

describe('database', () => {
  it('uses its own database with a meta and a content store, apart from the drafts one', async () => {
    const db = await openLocalDb()
    expect(db.name).toBe('rabisco-local')
    expect(LOCAL_DB_NAME).toBe('rabisco-local')
    expect([...db.objectStoreNames].sort()).toEqual(['content', 'meta', 'moved'])
  })

  it('shares one connection and opens again after a failure', async () => {
    const first = await openLocalDb()
    expect(await openLocalDb()).toBe(first)
    await closeLocalDb()
    vi.spyOn(indexedDB, 'open').mockImplementationOnce(() => {
      throw new Error('SecurityError')
    })
    await expect(openLocalDb()).rejects.toBeInstanceOf(DriveError)
    await expect(openLocalDb()).resolves.toBeTruthy()
  })

  it('rolls both stores back when anything in the transaction fails', async () => {
    await expect(
      runTx('readwrite', async ({ meta, content }) => {
        await request(meta.put({ ...valid }))
        await request(content.put({ id: 'local-1', content: '{}' }))
        throw new DriveError('unknown', 'disk full')
      }),
    ).rejects.toMatchObject({ kind: 'unknown', message: 'disk full' })
    await expect(readRecord('local-1')).resolves.toBeNull()
    expect(await runTx('readonly', ({ meta }) => request(meta.count()))).toBe(0)
  })
})

describe('validation of what was read', () => {
  it('accepts a well-formed record and drops unknown fields', () => {
    expect(parseMeta({ ...valid, extra: '<script>' })).toEqual(valid)
  })

  it.each([
    ['null', null],
    ['a string', 'x'],
    ['an empty id', { ...valid, id: '' }],
    ['a numeric name', { ...valid, name: 1 }],
    ['a blank name', { ...valid, name: '   ' }],
    ['a numeric version', { ...valid, version: 1 }],
    ['a missing revision', { ...valid, headRevisionId: undefined }],
    ['an invalid date', { ...valid, modifiedTime: 'yesterday' }],
  ])('rejects %s', (_label, raw) => {
    expect(parseMeta(raw)).toBeNull()
  })

  it('reads content that is text or bytes and nothing else', () => {
    expect(parseContent({ id: 'x', content: '{}' })).toBe('{}')
    expect(parseContent({ id: 'x', content: { bytes: new ArrayBuffer(2), mimeType: 'image/png' } })).toMatchObject({ mimeType: 'image/png' })
    expect(parseContent({ id: 'x', content: { bytes: 'no', mimeType: 'image/png' } })).toBeNull()
    expect(parseContent({ id: 'x', content: 5 })).toBeNull()
    expect(parseContent(undefined)).toBeNull()
  })

  it('timestamps never repeat, so ordering is total', () => {
    const stamps = Array.from({ length: 50 }, () => nextTimestamp())
    expect(new Set(stamps).size).toBe(50)
    expect([...stamps].sort()).toEqual(stamps)
  })
})

describe('moved-to bookkeeping', () => {
  it('records and clears the Drive copy', async () => {
    const client = createLocalDriveClient()
    const { id } = await client.createFile('A', '{}', 'local')
    await markMoved(id, 'drive-7')
    await expect(client.movedTo(id)).resolves.toBe('drive-7')
    await clearMoved(id)
    await expect(client.movedTo(id)).resolves.toBeNull()
  })

  it('refuses to record a copy for a drawing that is gone', async () => {
    await expect(markMoved('local-gone', 'drive-7')).rejects.toMatchObject({ kind: 'notFound' })
  })
})

describe('compare-and-delete', () => {
  it('deletes meta and content together when the revision still matches', async () => {
    const client = createLocalDriveClient()
    const { id, headRevisionId } = await client.createFile('A', '{}', 'local')
    await expect(deleteIfUnchanged(id, headRevisionId!, 'drive-9')).resolves.toBe(true)
    expect(await runTx('readonly', ({ meta }) => request(meta.count()))).toBe(0)
    expect(await runTx('readonly', ({ content }) => request(content.count()))).toBe(0)
  })

  it('leaves a forwarding address in the same transaction as the delete', async () => {
    const client = createLocalDriveClient()
    const { id, headRevisionId } = await client.createFile('A', '{}', 'local')
    await deleteIfUnchanged(id, headRevisionId!, 'drive-9')
    await expect(readMovedTo(id)).resolves.toBe('drive-9')
    await expect(client.movedTo(id)).resolves.toBe('drive-9')
    await expect(client.getMeta(id)).rejects.toMatchObject({ kind: 'notFound' })
    await expect(client.download(id)).rejects.toMatchObject({ kind: 'notFound' })
  })

  it('leaves no forwarding address when the revision moved on', async () => {
    const client = createLocalDriveClient()
    const { id, headRevisionId } = await client.createFile('A', '{}', 'local')
    await client.save(id, '{"b":1}')
    await deleteIfUnchanged(id, headRevisionId!, 'drive-9')
    await expect(readMovedTo(id)).resolves.toBeNull()
  })

  it('keeps everything when the revision moved on', async () => {
    const client = createLocalDriveClient()
    const { id, headRevisionId } = await client.createFile('A', '{}', 'local')
    await client.save(id, '{"b":1}')
    await expect(deleteIfUnchanged(id, headRevisionId!, 'drive-9')).resolves.toBe(false)
    await expect(client.download(id)).resolves.toBe('{"b":1}')
  })

  it('treats a drawing that is already gone as deleted', async () => {
    await expect(deleteIfUnchanged('local-gone', 'r', 'drive-9')).resolves.toBe(true)
  })
})

describe('upgrade from the first database version', () => {
  it('keeps the existing drawings and adds the moved store', async () => {
    await new Promise<void>((resolve, reject) => {
      const open = indexedDB.open('rabisco-local', 1)
      open.onupgradeneeded = () => {
        open.result.createObjectStore('meta', { keyPath: 'id' })
        open.result.createObjectStore('content', { keyPath: 'id' })
      }
      open.onsuccess = () => {
        const tx = open.result.transaction(['meta', 'content'], 'readwrite')
        tx.objectStore('meta').put({ ...valid, id: 'local-old' })
        tx.objectStore('content').put({ id: 'local-old', content: '{"old":true}' })
        tx.oncomplete = () => {
          open.result.close()
          resolve()
        }
      }
      open.onerror = () => reject(open.error)
    })
    const client = createLocalDriveClient()
    expect((await client.listFiles()).map((f) => f.id)).toEqual(['local-old'])
    await expect(client.download('local-old')).resolves.toBe('{"old":true}')
    expect([...(await openLocalDb()).objectStoreNames].sort()).toEqual(['content', 'meta', 'moved'])
  })
})

describe('localDbExists', () => {
  it('is false until the database is created, then true', async () => {
    await expect(localDbExists()).resolves.toBe(false)
    expect((await indexedDB.databases()).map((db) => db.name)).not.toContain('rabisco-local')
    await openLocalDb()
    await expect(localDbExists()).resolves.toBe(true)
  })

  it('is false without IndexedDB', async () => {
    const original = globalThis.indexedDB
    // @ts-expect-error simulating a browser without IndexedDB
    delete globalThis.indexedDB
    try {
      await expect(localDbExists()).resolves.toBe(false)
    } finally {
      globalThis.indexedDB = original
    }
  })

  it('falls back to the mode flag when the browser cannot list databases', async () => {
    const databases = indexedDB.databases
    // @ts-expect-error a browser without the API
    indexedDB.databases = undefined
    try {
      localStorage.clear()
      await expect(localDbExists()).resolves.toBe(false)
      localStorage.setItem('rabisco.mode', 'local')
      await expect(localDbExists()).resolves.toBe(true)
    } finally {
      indexedDB.databases = databases
      localStorage.clear()
    }
  })
})
