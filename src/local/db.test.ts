import { IDBFactory } from 'fake-indexeddb'
import { DriveError } from '../drive/errors'
import { createLocalDriveClient } from './client'
import { clearMoved, closeLocalDb, deleteIfUnchanged, LOCAL_DB_NAME, markMoved, nextTimestamp, openLocalDb, parseContent, parseMeta, readRecord, runTx, request } from './db'

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
    expect([...db.objectStoreNames].sort()).toEqual(['content', 'meta'])
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
    await expect(deleteIfUnchanged(id, headRevisionId!)).resolves.toBe(true)
    expect(await runTx('readonly', ({ meta }) => request(meta.count()))).toBe(0)
    expect(await runTx('readonly', ({ content }) => request(content.count()))).toBe(0)
  })

  it('keeps everything when the revision moved on', async () => {
    const client = createLocalDriveClient()
    const { id, headRevisionId } = await client.createFile('A', '{}', 'local')
    await client.save(id, '{"b":1}')
    await expect(deleteIfUnchanged(id, headRevisionId!)).resolves.toBe(false)
    await expect(client.download(id)).resolves.toBe('{"b":1}')
  })

  it('treats a drawing that is already gone as deleted', async () => {
    await expect(deleteIfUnchanged('local-gone', 'r')).resolves.toBe(true)
  })
})
