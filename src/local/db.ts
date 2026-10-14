import { DriveError } from '../drive/errors'
import { readMode } from '../mode/modeStorage'

// Drawings made without signing in live in their own database, apart from the drafts one ("rabisco"),
// so wiping drafts on sign-out can never touch them. `meta` holds what the file list needs;
// `content` holds the scene, and both are always written in the same transaction.
export const LOCAL_DB_NAME = 'rabisco-local'
// Version 2 added `moved`; upgrading from version 1 keeps every drawing.
const DB_VERSION = 2
const META = 'meta'
const CONTENT = 'content'
const MOVED = 'moved'

const MAX_NAME_LENGTH = 500
const MAX_THUMBNAIL_LENGTH = 1_000_000
const THUMBNAIL_PATTERN = /^data:image\/png;base64,[A-Za-z0-9+/=]+$/

export interface StoredMeta {
  id: string
  name: string
  version: string
  /** Unique per saved content; changes whenever the content does (renames leave it alone). */
  headRevisionId: string
  modifiedTime: string
  /** A PNG data URL; anything else found here is discarded. */
  thumbnail?: string
  /** Drive id of the copy made by "move to Drive"; keeps a retry from creating a second copy. */
  movedTo?: string
}

/** Text for scenes; bytes for the rare binary file saved next to a drawing (an exported PNG). */
export type StoredContent = string | { bytes: ArrayBuffer; mimeType: string }

/** Left behind when a drawing is moved to Drive, so its old local address can still lead to the copy. */
export interface MovedRecord {
  id: string
  driveId: string
  movedAt: number
}

export interface Stores {
  meta: IDBObjectStore
  content: IDBObjectStore
  moved: IDBObjectStore
}

export function toDriveError(error: unknown): DriveError {
  if (error instanceof DriveError) return error
  const message = error instanceof Error ? error.message : 'Local storage failed'
  return new DriveError('unknown', message)
}

let opening: Promise<IDBDatabase> | null = null

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new DriveError('unknown', 'IndexedDB is not available in this browser'))
      return
    }
    let request: IDBOpenDBRequest
    try {
      request = indexedDB.open(LOCAL_DB_NAME, DB_VERSION)
    } catch (error) {
      reject(toDriveError(error))
      return
    }
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META, { keyPath: 'id' })
      if (!db.objectStoreNames.contains(CONTENT)) db.createObjectStore(CONTENT, { keyPath: 'id' })
      if (!db.objectStoreNames.contains(MOVED)) db.createObjectStore(MOVED, { keyPath: 'id' })
    }
    request.onsuccess = () => {
      const db = request.result
      // Another tab upgrading or deleting the database: let go so it is reopened on the next use.
      db.onversionchange = () => {
        db.close()
        opening = null
      }
      db.onclose = () => {
        opening = null
      }
      resolve(db)
    }
    request.onerror = () => reject(toDriveError(request.error))
    request.onblocked = () => reject(new DriveError('unknown', 'The local database is blocked by another tab'))
  })
}

export function openLocalDb(): Promise<IDBDatabase> {
  // A failed attempt is not remembered, so the next call (or "try again") can succeed.
  opening ??= open().catch((error: unknown) => {
    opening = null
    throw toDriveError(error)
  })
  return opening
}

/**
 * Whether the local database already exists, answered without creating it: visiting the app in the
 * Google mode must leave no database behind. Browsers that cannot list databases fall back to the
 * mode flag (the local mode creates the database as soon as it is entered).
 */
export async function localDbExists(): Promise<boolean> {
  if (typeof indexedDB === 'undefined') return false
  if (opening) return true
  if (typeof indexedDB.databases === 'function') {
    try {
      return (await indexedDB.databases()).some((info) => info.name === LOCAL_DB_NAME)
    } catch {
      // Fall through to the flag.
    }
  }
  return readMode() === 'local'
}

/** Closes the connection and forgets it; the next call opens the database again. */
export async function closeLocalDb(): Promise<void> {
  const pending = opening
  opening = null
  if (pending) (await pending.catch(() => null))?.close()
}

export function request<T>(source: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    source.onsuccess = () => resolve(source.result)
    source.onerror = () => reject(toDriveError(source.error))
  })
}

/**
 * Runs `body` inside one transaction over both stores. The promise settles when the transaction
 * has committed, so a resolved write is really on disk; a failure anywhere aborts everything.
 */
export async function runTx<T>(mode: IDBTransactionMode, body: (stores: Stores) => Promise<T>): Promise<T> {
  const db = await openLocalDb()
  return new Promise<T>((resolve, reject) => {
    let tx: IDBTransaction
    try {
      tx = db.transaction([META, CONTENT, MOVED], mode)
    } catch (error) {
      reject(toDriveError(error))
      return
    }
    let result: T
    let failure: unknown
    let failed = false
    tx.oncomplete = () => (failed ? reject(toDriveError(failure)) : resolve(result))
    tx.onabort = () => reject(toDriveError(failed ? failure : tx.error))
    body({ meta: tx.objectStore(META), content: tx.objectStore(CONTENT), moved: tx.objectStore(MOVED) }).then(
      (value) => {
        result = value
      },
      (error: unknown) => {
        failed = true
        failure = error
        try {
          tx.abort()
        } catch {
          // Already finished.
        }
      },
    )
  })
}

/** The stored thumbnail if it is a small PNG data URL; anything else is dropped. */
export function validThumbnail(value: unknown): string | undefined {
  return typeof value === 'string' && value.length <= MAX_THUMBNAIL_LENGTH && THUMBNAIL_PATTERN.test(value) ? value : undefined
}

/** The database is untrusted input (extensions and devtools can edit it): only well-formed records get through. */
export function parseMeta(raw: unknown): StoredMeta | null {
  if (typeof raw !== 'object' || raw === null) return null
  const record = raw as Record<string, unknown>
  const { id, name, version, headRevisionId, modifiedTime, movedTo } = record
  if (typeof id !== 'string' || id === '') return null
  if (typeof name !== 'string' || name.trim() === '' || name.length > MAX_NAME_LENGTH) return null
  if (typeof version !== 'string' || typeof headRevisionId !== 'string' || headRevisionId === '') return null
  if (typeof modifiedTime !== 'string' || Number.isNaN(Date.parse(modifiedTime))) return null
  const meta: StoredMeta = { id, name, version, headRevisionId, modifiedTime }
  const thumbnail = validThumbnail(record.thumbnail)
  if (thumbnail) meta.thumbnail = thumbnail
  if (typeof movedTo === 'string' && movedTo !== '') meta.movedTo = movedTo
  return meta
}

export function parseContent(raw: unknown): StoredContent | null {
  if (typeof raw !== 'object' || raw === null) return null
  const content = (raw as { content?: unknown }).content
  if (typeof content === 'string') return content
  if (typeof content === 'object' && content !== null) {
    const { bytes, mimeType } = content as { bytes?: unknown; mimeType?: unknown }
    if (bytes instanceof ArrayBuffer && typeof mimeType === 'string') return { bytes, mimeType }
  }
  return null
}

let lastTimestamp = 0
/** Strictly increasing, so "most recent first" is a total order even for saves in the same millisecond. */
export function nextTimestamp(): string {
  lastTimestamp = Math.max(Date.now(), lastTimestamp + 1)
  return new Date(lastTimestamp).toISOString()
}

export function newRevision(): string {
  return crypto.randomUUID()
}

/** Tells the browser not to evict the drawings under storage pressure; best effort, once per session. */
let persistAsked = false
export function requestPersistence(): void {
  if (persistAsked) return
  persistAsked = true
  try {
    void navigator.storage?.persist?.().catch(() => undefined)
  } catch {
    // Not supported: nothing else to do.
  }
}

export async function readMetas(stores: Stores): Promise<StoredMeta[]> {
  const rows = await request(stores.meta.getAll())
  const metas: StoredMeta[] = []
  for (const row of rows as unknown[]) {
    const meta = parseMeta(row)
    if (meta) metas.push(meta)
  }
  return metas
}

export interface LocalRecord {
  meta: StoredMeta
  content: StoredContent
}

/** One drawing as stored (meta and scene together), or null when absent or malformed. */
export async function readRecord(id: string): Promise<LocalRecord | null> {
  return runTx('readonly', async ({ meta, content }) => {
    const parsedMeta = parseMeta(await request(meta.get(id)))
    const parsedContent = parseContent(await request(content.get(id)))
    return parsedMeta && parsedContent !== null ? { meta: parsedMeta, content: parsedContent } : null
  })
}

/** Every well-formed drawing's meta, most recent first. */
export function listMetas(): Promise<StoredMeta[]> {
  return runTx('readonly', async (stores) => (await readMetas(stores)).sort(byRecency))
}

export function byRecency(a: StoredMeta, b: StoredMeta): number {
  return b.modifiedTime.localeCompare(a.modifiedTime) || a.id.localeCompare(b.id)
}

/** Records the Drive copy of a drawing, before anything else is done with it. */
export async function markMoved(id: string, driveId: string): Promise<void> {
  await runTx('readwrite', async ({ meta }) => {
    const current = parseMeta(await request(meta.get(id)))
    if (!current) throw new DriveError('notFound', 'File not found', 404)
    await request(meta.put({ ...current, movedTo: driveId }))
  })
}

export async function clearMoved(id: string): Promise<void> {
  await runTx('readwrite', async ({ meta }) => {
    const current = parseMeta(await request(meta.get(id)))
    if (!current) return
    const { movedTo: _movedTo, ...rest } = current
    void _movedTo
    await request(meta.put(rest))
  })
}

/**
 * Deletes a drawing only if it is still at the revision that was read earlier. Returns false when it
 * changed meanwhile (another tab kept editing): then nothing is deleted.
 */
export async function deleteIfUnchanged(id: string, headRevisionId: string, driveId: string): Promise<boolean> {
  return runTx('readwrite', async ({ meta, content, moved }) => {
    const raw = await request(meta.get(id))
    if (raw === undefined) return true // already gone
    const current = parseMeta(raw)
    if (!current || current.headRevisionId !== headRevisionId) return false
    await request(meta.delete(id))
    await request(content.delete(id))
    // Same transaction as the delete: the drawing is never gone without its forwarding address.
    await request(moved.put({ id, driveId, movedAt: Date.now() } satisfies MovedRecord))
    return true
  })
}

/** Drive id of a drawing that was moved, read from what the move left behind. */
export async function readMovedTo(id: string): Promise<string | null> {
  const raw = await runTx('readonly', ({ moved }) => request(moved.get(id)))
  const record = raw as Partial<MovedRecord> | undefined
  return typeof record?.driveId === 'string' && record.driveId !== '' ? record.driveId : null
}
