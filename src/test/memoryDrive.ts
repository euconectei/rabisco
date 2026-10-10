import type { DriveClient, DriveFileMeta, DriveThumbnail } from '../drive/client'
import { DriveError } from '../drive/errors'

interface StoredFile {
  meta: DriveFileMeta
  content: string
  thumbnail?: DriveThumbnail
}

// In-memory DriveClient for component tests. Methods are spies; files can be edited "externally".
export function memoryDrive(initial: Array<{ id: string; name: string; content: string }> = []) {
  const files = new Map<string, StoredFile>()
  let nextId = 1
  let clock = Date.parse('2026-10-09T12:00:00Z')
  const tick = () => new Date((clock += 1000)).toISOString()

  let revision = 1
  const nextRevision = () => `rev-${revision++}`
  const put = (id: string, name: string, content: string, version = '1', parents = ['folder-1']) => {
    files.set(id, { meta: { id, name, version, headRevisionId: nextRevision(), modifiedTime: tick(), parents }, content })
  }
  initial.forEach((file) => put(file.id, file.name, file.content))

  const find = (id: string) => {
    const file = files.get(id)
    if (!file) throw new DriveError('notFound', 'File not found', 404)
    return file
  }
  // Drive bumps `version` on any change (metadata included) but `headRevisionId` only on content.
  const bump = (file: StoredFile, contentChanged: boolean) => {
    file.meta = {
      ...file.meta,
      version: String(Number(file.meta.version) + 1),
      modifiedTime: tick(),
      ...(contentChanged ? { headRevisionId: nextRevision() } : {}),
    }
  }

  const client = {
    ensureFolder: vi.fn(async () => 'folder-1'),
    listFiles: vi.fn(async () =>
      [...files.values()]
        .map((file) => file.meta)
        .filter((meta) => meta.name.toLowerCase().endsWith('.excalidraw'))
        .sort((a, b) => b.modifiedTime.localeCompare(a.modifiedTime)),
    ),
    createFile: vi.fn(async (name: string, content: string, folderId: string) => {
      const id = `file-${nextId++}`
      put(id, name.endsWith('.excalidraw') ? name : `${name}.excalidraw`, content, '1', [folderId])
      return { ...find(id).meta }
    }),
    getMeta: vi.fn(async (id: string) => ({ ...find(id).meta })),
    download: vi.fn(async (id: string) => find(id).content),
    save: vi.fn(async (id: string, content: string, thumbnail?: DriveThumbnail) => {
      const file = find(id)
      file.content = content
      file.thumbnail = thumbnail
      bump(file, true)
      return { ...file.meta }
    }),
    rename: vi.fn(async (id: string, name: string) => {
      const file = find(id)
      file.meta = { ...file.meta, name: name.endsWith('.excalidraw') ? name : `${name}.excalidraw` }
      bump(file, false)
      return { ...file.meta }
    }),
    createSibling: vi.fn(async (name: string, content: string, _mime: string, nearFileId: string) => {
      const parents = files.get(nearFileId)?.meta.parents ?? ['folder-1']
      const id = `file-${nextId++}`
      put(id, name, content, '1', parents)
      return { ...find(id).meta }
    }),
  } satisfies DriveClient

  return {
    client,
    files,
    /** Simulates an edit made outside the app (another tab, the tablet). */
    editExternally(id: string, content: string) {
      const file = find(id)
      file.content = content
      bump(file, true)
    },
    /** Simulates Drive changing metadata on its own (e.g. processing the thumbnail). */
    touchMetadata(id: string) {
      bump(find(id), false)
    },
    remove(id: string) {
      files.delete(id)
    },
  }
}
