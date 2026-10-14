import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { DriveError } from '../drive/errors'
import { deleteDraft, getDraft, putDraft } from '../editor/drafts'
import { memoryDrive } from '../test/memoryDrive'
import { createLocalDriveClient, type LocalDriveClient } from './client'
import { closeLocalDb, runTx, request } from './db'
import { countLocalDrawings, markMoveOfferAnswered, MOVE_OFFER_KEY, moveLocalDrawings, moveOfferAnswered, resetMoveOffer } from './move'

const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAHnOcZQAAAABJRU5ErkJggg'

let local: LocalDriveClient

beforeEach(async () => {
  await closeLocalDb()
  globalThis.indexedDB = new IDBFactory()
  local = createLocalDriveClient()
  sessionStorage.clear()
  resetMoveOffer()
})
afterEach(() => vi.restoreAllMocks())

const scene = (text: string) => `{"type":"excalidraw","elements":[{"text":"${text}"}]}`

async function seed(...names: string[]) {
  const metas = []
  for (const name of names) metas.push(await local.createFile(name, scene(name), 'local'))
  return metas
}

describe('moving local drawings to Drive', () => {
  it('copies every drawing to the Rabisco folder with the same name and scene, then deletes the local ones', async () => {
    const [a, b] = await seed('A', 'B')
    const drive = memoryDrive()
    const progress = vi.fn()

    const report = await moveLocalDrawings(drive.client, { onProgress: progress })

    expect(report).toEqual({ total: 2, moved: 2, failed: 0, failures: [], busy: false })
    expect(progress).toHaveBeenLastCalledWith(2, 2)
    const remote = await drive.client.listFiles()
    expect(remote.map((f) => f.name).sort()).toEqual(['A.excalidraw', 'B.excalidraw'])
    for (const file of remote) {
      expect(file.parents).toEqual(['folder-1'])
      expect(await drive.client.download(file.id)).toBe(scene(file.name.replace('.excalidraw', '')))
    }
    await expect(local.getMeta(a.id)).rejects.toMatchObject({ kind: 'notFound' })
    await expect(local.download(b.id)).rejects.toMatchObject({ kind: 'notFound' })
    await expect(local.listFiles()).resolves.toEqual([])
  })

  it('sends the thumbnail along', async () => {
    const [a] = await seed('A')
    await local.save(a.id, scene('A'), { image: PNG, mimeType: 'image/png' })
    const drive = memoryDrive()
    await moveLocalDrawings(drive.client)
    expect(drive.client.save).toHaveBeenCalledWith(expect.any(String), scene('A'), { image: PNG, mimeType: 'image/png' })
  })

  it('keeps going after a failure: the first moves, the second stays intact, the third is tried too', async () => {
    const [a, b, c] = await seed('A', 'B', 'C')
    const drive = memoryDrive()
    const create = drive.client.createFile.getMockImplementation()!
    drive.client.createFile.mockImplementation(async (name, content, folder) => {
      if (name === 'B.excalidraw') throw new DriveError('server', 'boom', 500)
      return create(name, content, folder)
    })

    const report = await moveLocalDrawings(drive.client)

    expect(report.moved).toBe(2)
    expect(report.failed).toBe(1)
    expect(report.failures).toEqual([{ id: b.id, name: 'B.excalidraw', reason: 'error' }])
    await expect(local.getMeta(a.id)).rejects.toMatchObject({ kind: 'notFound' })
    await expect(local.getMeta(c.id)).rejects.toMatchObject({ kind: 'notFound' })
    await expect(local.download(b.id)).resolves.toBe(scene('B'))
    expect((await drive.client.listFiles()).map((f) => f.name).sort()).toEqual(['A.excalidraw', 'C.excalidraw'])
  })

  it('retries only the failed ones and never duplicates a copy that was already made', async () => {
    const [a, b] = await seed('A', 'B')
    const drive = memoryDrive()
    // The upload of B succeeds, but the download that verifies it fails (token expired midway).
    const download = drive.client.download.getMockImplementation()!
    let failOnce = true
    drive.client.download.mockImplementation(async (id) => {
      if (failOnce && (await drive.client.getMeta(id)).name === 'B.excalidraw') {
        failOnce = false
        throw new DriveError('auth', 'expired', 401)
      }
      return download(id)
    })

    const first = await moveLocalDrawings(drive.client)
    expect(first.failures.map((f) => f.id)).toEqual([b.id])
    expect(await local.movedTo(b.id)).toEqual(expect.any(String))
    await expect(local.download(b.id)).resolves.toBe(scene('B'))

    const createCalls = drive.client.createFile.mock.calls.length
    const second = await moveLocalDrawings(drive.client, { ids: first.failures.map((f) => f.id) })

    expect(second).toMatchObject({ total: 1, moved: 1, failed: 0 })
    expect(drive.client.createFile.mock.calls.length).toBe(createCalls)
    expect((await drive.client.listFiles()).map((f) => f.name).sort()).toEqual(['A.excalidraw', 'B.excalidraw'])
    await expect(local.getMeta(b.id)).rejects.toMatchObject({ kind: 'notFound' })
    await expect(local.getMeta(a.id)).rejects.toMatchObject({ kind: 'notFound' })
  })

  it('records the Drive copy before it downloads and verifies it', async () => {
    const [a] = await seed('A')
    const drive = memoryDrive()
    let recorded: string | null = null
    drive.client.download.mockImplementationOnce(async () => {
      recorded = await local.movedTo(a.id)
      throw new DriveError('network', 'offline')
    })
    await moveLocalDrawings(drive.client)
    expect(recorded).toEqual(expect.any(String))
  })

  it('does not delete a drawing that was edited while it was being copied', async () => {
    const [a] = await seed('A')
    const drive = memoryDrive()
    const download = drive.client.download.getMockImplementation()!
    drive.client.download.mockImplementation(async (id) => {
      const copy = await download(id)
      await local.save(a.id, scene('A edited in another tab')) // the verification read is done; an edit lands now
      return copy
    })

    const report = await moveLocalDrawings(drive.client)

    expect(report.failures).toEqual([{ id: a.id, name: 'A.excalidraw', reason: 'changed' }])
    await expect(local.download(a.id)).resolves.toBe(scene('A edited in another tab'))
  })

  it('brings a stale copy up to date on retry instead of deleting the newer local drawing', async () => {
    const [a] = await seed('A')
    const drive = memoryDrive()
    const download = drive.client.download.getMockImplementation()!
    let edited = false
    drive.client.download.mockImplementation(async (id) => {
      const copy = await download(id)
      if (!edited) {
        edited = true
        await local.save(a.id, scene('newer'))
      }
      return copy
    })
    await moveLocalDrawings(drive.client)

    const retry = await moveLocalDrawings(drive.client, { ids: [a.id] })

    expect(retry.moved).toBe(1)
    const [copy] = await drive.client.listFiles()
    await expect(drive.client.download(copy.id)).resolves.toBe(scene('newer'))
    expect(await drive.client.listFiles()).toHaveLength(1)
  })

  it('creates a new copy when the one from an earlier attempt was deleted from Drive', async () => {
    const [a] = await seed('A')
    const drive = memoryDrive()
    drive.client.download.mockRejectedValueOnce(new DriveError('network', 'offline'))
    await moveLocalDrawings(drive.client)
    const firstCopy = await local.movedTo(a.id)
    drive.client.download.mockImplementationOnce(async () => {
      throw new DriveError('notFound', 'gone', 404)
    })

    const retry = await moveLocalDrawings(drive.client, { ids: [a.id] })

    expect(retry.moved).toBe(1)
    expect(drive.client.createFile).toHaveBeenCalledTimes(2)
    expect(firstCopy).toBeTruthy()
  })

  it('does not delete anything when the downloaded text differs from what was sent', async () => {
    const [a] = await seed('A')
    const drive = memoryDrive()
    drive.client.download.mockResolvedValue('{"truncated":')

    const report = await moveLocalDrawings(drive.client)

    expect(report.failures).toEqual([{ id: a.id, name: 'A.excalidraw', reason: 'mismatch' }])
    await expect(local.download(a.id)).resolves.toBe(scene('A'))
  })

  it('treats an expired sign-in as a failure of that drawing, never as a success', async () => {
    const [a] = await seed('A')
    const drive = memoryDrive()
    drive.client.createFile.mockRejectedValue(new DriveError('auth', 'expired', 401))
    const report = await moveLocalDrawings(drive.client)
    expect(report).toMatchObject({ moved: 0, failed: 1 })
    await expect(local.getMeta(a.id)).resolves.toMatchObject({ id: a.id })
  })

  it('does not move a drawing that has unsaved edits waiting in a draft', async () => {
    const [a, b] = await seed('A', 'B')
    await putDraft({ fileId: a.id, json: scene('A, typed but not saved'), baseVersion: a.headRevisionId!, updatedAt: 1 })
    const drive = memoryDrive()

    const report = await moveLocalDrawings(drive.client)

    expect(report.failures).toEqual([{ id: a.id, name: 'A.excalidraw', reason: 'draft' }])
    expect(report.moved).toBe(1)
    await expect(local.download(a.id)).resolves.toBe(scene('A'))
    await expect(getDraft(a.id)).resolves.toMatchObject({ json: scene('A, typed but not saved') })
    await expect(local.getMeta(b.id)).rejects.toMatchObject({ kind: 'notFound' })
    await deleteDraft(a.id)
  })

  it('drops a leftover draft that holds nothing beyond what was moved', async () => {
    const [a] = await seed('A')
    await putDraft({ fileId: a.id, json: scene('A'), baseVersion: a.headRevisionId!, updatedAt: 1 })
    const report = await moveLocalDrawings(memoryDrive().client)
    expect(report.moved).toBe(1)
    await expect(getDraft(a.id)).resolves.toBeNull()
  })

  it('leaves the drafts of Drive files alone', async () => {
    await seed('A')
    await putDraft({ fileId: 'drive-9', json: '{}', baseVersion: '1', updatedAt: 1 })
    await moveLocalDrawings(memoryDrive().client)
    await expect(getDraft('drive-9')).resolves.not.toBeNull()
    await deleteDraft('drive-9')
  })

  it('reports a damaged record instead of throwing, and moves the rest', async () => {
    const [a, b] = await seed('A', 'B')
    await runTx('readwrite', async ({ content }) => {
      await request(content.put({ id: a.id, content: 42 }))
    })
    const report = await moveLocalDrawings(memoryDrive().client)
    expect(report.failures).toEqual([{ id: a.id, name: 'A.excalidraw', reason: 'damaged' }])
    await expect(local.getMeta(b.id)).rejects.toMatchObject({ kind: 'notFound' })
  })

  it('refuses to run twice at the same time', async () => {
    await seed('A')
    const drive = memoryDrive()
    const [first, second] = await Promise.all([moveLocalDrawings(drive.client), moveLocalDrawings(drive.client)])
    expect([first.busy, second.busy].sort()).toEqual([false, true])
    expect(drive.client.createFile).toHaveBeenCalledTimes(1)
  })

  it('does nothing when there are no local drawings', async () => {
    const drive = memoryDrive()
    await expect(moveLocalDrawings(drive.client)).resolves.toEqual({ total: 0, moved: 0, failed: 0, failures: [], busy: false })
    expect(drive.client.ensureFolder).not.toHaveBeenCalled()
  })

  it('fails every drawing, and deletes none, when the Rabisco folder cannot be found, then recovers', async () => {
    await seed('A', 'B')
    const drive = memoryDrive()
    drive.client.ensureFolder.mockRejectedValueOnce(new DriveError('network', 'offline'))
    const report = await moveLocalDrawings(drive.client)
    expect(report.moved).toBe(1)
    expect(report.failed).toBe(1)
    expect(await countLocalDrawings()).toBe(1)
  })
})

describe('Web Locks', () => {
  it('asks for the lock without waiting when the browser has Web Locks', async () => {
    await seed('A')
    const request = vi.fn(async (_name: string, _options: unknown, callback: (lock: unknown) => unknown) => callback(null))
    vi.stubGlobal('navigator', { ...navigator, locks: { request } })
    const drive = memoryDrive()
    const report = await moveLocalDrawings(drive.client)
    expect(request).toHaveBeenCalledWith('rabisco-move', { ifAvailable: true }, expect.any(Function))
    expect(report.busy).toBe(true)
    expect(drive.client.createFile).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
})

describe('the offer flag', () => {
  it('is remembered for the session under rabisco.moveOffer', () => {
    expect(moveOfferAnswered()).toBe(false)
    markMoveOfferAnswered()
    expect(MOVE_OFFER_KEY).toBe('rabisco.moveOffer')
    expect(sessionStorage.getItem('rabisco.moveOffer')).toBe('done')
    expect(moveOfferAnswered()).toBe(true)
  })

  it('still holds for the page when sessionStorage refuses', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    markMoveOfferAnswered()
    expect(moveOfferAnswered()).toBe(true)
  })
})

describe('countLocalDrawings', () => {
  it('counts drawings and answers 0 when the storage cannot be read', async () => {
    await seed('A', 'B', 'C')
    await expect(countLocalDrawings()).resolves.toBe(3)
    await closeLocalDb()
    vi.spyOn(indexedDB, 'open').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    await expect(countLocalDrawings()).resolves.toBe(0)
  })
})
