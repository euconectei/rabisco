import type { DriveClient } from '../drive/client'
import { memoryDrive } from '../test/memoryDrive'
import { createRoutingClient } from './routing'

function setup() {
  const local = memoryDrive([{ id: 'local-1', name: 'Local.excalidraw', content: '{"l":1}' }]).client
  const remote = memoryDrive([{ id: 'drive-1', name: 'Drive.excalidraw', content: '{"d":1}' }]).client
  return { local, remote, router: createRoutingClient(local, remote) }
}

describe('routing client', () => {
  it('sends calls about local ids to the local client and the rest to Drive', async () => {
    const { local, remote, router } = setup()
    await expect(router.download('local-1')).resolves.toBe('{"l":1}')
    await expect(router.download('drive-1')).resolves.toBe('{"d":1}')
    await router.getMeta('local-1')
    await router.save('local-1', '{"l":2}')
    await router.rename('local-1', 'Novo')
    expect(local.save).toHaveBeenCalledWith('local-1', '{"l":2}', undefined)
    expect(local.rename).toHaveBeenCalledWith('local-1', 'Novo')
    expect(remote.save).not.toHaveBeenCalled()
    expect(remote.getMeta).not.toHaveBeenCalledWith('local-1')

    await router.save('drive-1', '{"d":2}')
    await router.rename('drive-1', 'Outro')
    expect(remote.save).toHaveBeenCalledWith('drive-1', '{"d":2}', undefined)
    expect(local.download).toHaveBeenCalledTimes(1)
  })

  it('lists and looks up the folder in Drive only', async () => {
    const { local, remote, router } = setup()
    expect((await router.listFiles()).map((f) => f.id)).toEqual(['drive-1'])
    await router.ensureFolder()
    expect(remote.ensureFolder).toHaveBeenCalled()
    expect(local.listFiles).not.toHaveBeenCalled()
    expect(local.ensureFolder).not.toHaveBeenCalled()
  })

  it('creates in Drive by default and locally for the local folder', async () => {
    const { local, remote, router } = setup()
    await router.createFile('A', '{}', 'folder-1')
    expect(remote.createFile).toHaveBeenCalledTimes(1)
    await router.createFile('B', '{}', 'local')
    expect(local.createFile).toHaveBeenCalledTimes(1)
  })

  it('creates siblings next to the file they belong to', async () => {
    const { local, remote, router } = setup()
    await router.createSibling('Local.md', '# x', 'text/markdown', 'local-1')
    expect(local.createSibling).toHaveBeenCalledTimes(1)
    await router.createSibling('Drive.md', '# x', 'text/markdown', 'drive-1')
    expect(remote.createSibling).toHaveBeenCalledTimes(1)
  })

  it('exposes exactly the DriveClient methods', () => {
    const keys = Object.keys(setup().router).sort()
    const expected: Array<keyof DriveClient> = ['createFile', 'createSibling', 'download', 'ensureFolder', 'getMeta', 'listFiles', 'rename', 'save']
    expect(keys).toEqual(expected)
  })
})

describe('opening a local id when the local database was never created', () => {
  it('answers not found without creating the database', async () => {
    const { IDBFactory } = await import('fake-indexeddb')
    const { closeLocalDb } = await import('./db')
    const { createLocalDriveClient } = await import('./client')
    await closeLocalDb()
    globalThis.indexedDB = new IDBFactory()
    const router = createRoutingClient(createLocalDriveClient(), memoryDrive().client)

    await expect(router.getMeta('local-xyz')).rejects.toMatchObject({ kind: 'notFound' })
    await expect(router.download('local-xyz')).rejects.toMatchObject({ kind: 'notFound' })
    await expect(router.save('local-xyz', '{}')).rejects.toMatchObject({ kind: 'notFound' })
    await expect(router.rename('local-xyz', 'x')).rejects.toMatchObject({ kind: 'notFound' })
    await expect(router.createSibling('x.md', '', 'text/markdown', 'local-xyz')).rejects.toMatchObject({ kind: 'notFound' })
    expect((await indexedDB.databases()).map((db) => db.name)).not.toContain('rabisco-local')
  })
})
