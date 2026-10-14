import type { DriveClient, DriveFileMeta, DriveThumbnail } from '../drive/client'
import { DriveError } from '../drive/errors'
import {
  byRecency,
  newRevision,
  nextTimestamp,
  parseContent,
  parseMeta,
  readMetas,
  request,
  requestPersistence,
  runTx,
  validThumbnail,
  type StoredContent,
  type StoredMeta,
} from './db'
import { newLocalId } from './ids'

/** `ensureFolder()` of the local client: there is only one "folder", this browser. */
export const LOCAL_FOLDER_ID = 'local'

const EXTENSION = '.excalidraw'
// Names longer than this are cut on write; the database refuses to list longer ones.
const MAX_BASE_NAME = 400
const MAX_NAME_ATTEMPTS = 100

export interface LocalDriveClient extends DriveClient {
  /** Drive id of the copy made by "move to Drive", if one was recorded. */
  movedTo(id: string): Promise<string | null>
}

function withExtension(name: string): string {
  const trimmed = name.trim().slice(0, MAX_BASE_NAME)
  return trimmed.toLowerCase().endsWith(EXTENSION) ? trimmed : `${trimmed}${EXTENSION}`
}

function numberedName(name: string, n: number): string {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? `${name.slice(0, dot)} (${n})${name.slice(dot)}` : `${name} (${n})`
}

function toFileMeta(meta: StoredMeta, withThumbnail = false): DriveFileMeta {
  return {
    id: meta.id,
    name: meta.name,
    version: meta.version,
    headRevisionId: meta.headRevisionId,
    modifiedTime: meta.modifiedTime,
    parents: [LOCAL_FOLDER_ID],
    ...(withThumbnail && meta.thumbnail ? { thumbnailLink: meta.thumbnail } : {}),
  }
}

const notFound = () => new DriveError('notFound', 'File not found', 404)

/** The editor sends URL-safe base64; a data URL needs the standard alphabet and padding. */
function thumbnailDataUrl(thumbnail: DriveThumbnail | undefined): string | undefined {
  if (!thumbnail || thumbnail.mimeType !== 'image/png' || !/^[A-Za-z0-9_-]+={0,2}$/.test(thumbnail.image)) return undefined
  const base64 = thumbnail.image.replace(/=+$/, '').replace(/-/g, '+').replace(/_/g, '/')
  return validThumbnail(`data:image/png;base64,${base64}${'='.repeat((4 - (base64.length % 4)) % 4)}`)
}

function readBlob(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') return blob.arrayBuffer()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(new DriveError('unknown', 'Could not read the file'))
    reader.readAsArrayBuffer(blob)
  })
}

async function toStoredContent(content: string | Blob, mimeType: string): Promise<StoredContent> {
  return typeof content === 'string' ? content : { bytes: await readBlob(content), mimeType }
}

/** A DriveClient over IndexedDB, for drawings kept only in this browser. */
export function createLocalDriveClient(): LocalDriveClient {
  async function insert(name: string, content: StoredContent, nearFileId?: string, unique = false): Promise<DriveFileMeta> {
    const meta = await runTx('readwrite', async (stores) => {
      const existing = await readMetas(stores)
      if (nearFileId && !existing.some((m) => m.id === nearFileId)) throw notFound()
      let finalName = name
      if (unique) {
        const taken = new Set(existing.map((m) => m.name))
        for (let n = 2; n <= MAX_NAME_ATTEMPTS && taken.has(finalName); n++) finalName = numberedName(name, n)
      }
      const created: StoredMeta = {
        id: newLocalId(),
        name: finalName,
        version: '1',
        headRevisionId: newRevision(),
        modifiedTime: nextTimestamp(),
      }
      await request(stores.meta.put(created))
      await request(stores.content.put({ id: created.id, content }))
      return created
    })
    requestPersistence()
    return toFileMeta(meta)
  }

  async function update(id: string, change: (meta: StoredMeta) => StoredMeta, content?: string): Promise<DriveFileMeta> {
    const meta = await runTx('readwrite', async ({ meta: metaStore, content: contentStore }) => {
      const raw = await request(metaStore.get(id))
      if (raw === undefined) throw notFound()
      const current = parseMeta(raw)
      if (!current) throw new DriveError('invalidFile', 'This drawing is damaged')
      const next = change(current)
      await request(metaStore.put(next))
      if (content !== undefined) await request(contentStore.put({ id, content }))
      return next
    })
    return toFileMeta(meta)
  }

  return {
    async ensureFolder() {
      return LOCAL_FOLDER_ID
    },

    async listFiles() {
      const metas = await runTx('readonly', async (stores) => readMetas(stores))
      return metas
        .filter((meta) => meta.name.toLowerCase().endsWith(EXTENSION))
        .sort(byRecency)
        .map((meta) => toFileMeta(meta, true))
    },

    async createFile(name, content) {
      return insert(withExtension(name), content)
    },

    async getMeta(id) {
      const raw = await runTx('readonly', ({ meta }) => request(meta.get(id)))
      if (raw === undefined) throw notFound()
      const meta = parseMeta(raw)
      if (!meta) throw new DriveError('invalidFile', 'This drawing is damaged')
      return toFileMeta(meta)
    },

    async download(id) {
      const raw = await runTx('readonly', async ({ meta, content }) => {
        if ((await request(meta.get(id))) === undefined) throw notFound()
        return request(content.get(id))
      })
      const content = parseContent(raw)
      if (typeof content !== 'string') throw new DriveError('invalidFile', 'This drawing is damaged')
      return content
    },

    async save(id, content, thumbnail) {
      const dataUrl = thumbnailDataUrl(thumbnail)
      const saved = await update(
        id,
        (current) => ({
          ...current,
          version: String(Number(current.version) + 1 || 2),
          headRevisionId: newRevision(),
          modifiedTime: nextTimestamp(),
          ...(dataUrl ? { thumbnail: dataUrl } : {}),
        }),
        content,
      )
      requestPersistence()
      return saved
    },

    rename(id, name) {
      return update(id, (current) => ({
        ...current,
        name: withExtension(name),
        version: String(Number(current.version) + 1 || 2),
        modifiedTime: nextTimestamp(),
      }))
    },

    async createSibling(name, content, mimeType, nearFileId) {
      const stored = await toStoredContent(content, mimeType)
      return insert(name.trim().slice(0, MAX_BASE_NAME), stored, nearFileId, true)
    },

    async movedTo(id) {
      const raw = await runTx('readonly', ({ meta }) => request(meta.get(id)))
      return parseMeta(raw)?.movedTo ?? null
    },
  }
}
