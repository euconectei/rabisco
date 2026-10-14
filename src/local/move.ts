import type { DriveClient, DriveThumbnail } from '../drive/client'
import { DriveError } from '../drive/errors'
import { deleteDraft, getDraft, type Draft } from '../editor/drafts'
import { clearMoved, deleteIfUnchanged, listMetas, localDbExists, markMoved, readRecord, toDriveError, type StoredMeta } from './db'

/** sessionStorage key: the offer to move local drawings was answered during this browser session. */
export const MOVE_OFFER_KEY = 'rabisco.moveOffer'

let offerAnsweredInMemory = false

export function moveOfferAnswered(): boolean {
  if (offerAnsweredInMemory) return true
  try {
    return sessionStorage.getItem(MOVE_OFFER_KEY) === 'done'
  } catch {
    return false
  }
}

export function markMoveOfferAnswered(): void {
  offerAnsweredInMemory = true
  try {
    sessionStorage.setItem(MOVE_OFFER_KEY, 'done')
  } catch {
    // Without sessionStorage the answer only lasts while this page stays open.
  }
}

/** Test seam. */
export function resetMoveOffer(): void {
  offerAnsweredInMemory = false
}

/** How many drawings are waiting in this browser (0 when the storage cannot be read). */
export async function countLocalDrawings(): Promise<number> {
  try {
    if (!(await localDbExists())) return 0
    return (await listMetas()).filter((meta) => meta.name.toLowerCase().endsWith('.excalidraw')).length
  } catch {
    return 0
  }
}

export type MoveFailureReason =
  /** The drawing was edited (in another tab) while it was being copied; nothing was deleted. */
  | 'changed'
  /** Unsaved edits are waiting in the draft store; moving now would lose them. */
  | 'draft'
  /** The copy in Drive is not identical to the local drawing; nothing was deleted. */
  | 'mismatch'
  /** The local record is damaged or missing. */
  | 'damaged'
  /** Drive (or the local database) failed: expired sign-in, network, quota… */
  | 'error'

export interface MoveFailure {
  id: string
  name: string
  reason: MoveFailureReason
}

export interface MoveReport {
  total: number
  moved: number
  failed: number
  failures: MoveFailure[]
  /** True when another move was already running (another tab): nothing was done. */
  busy: boolean
}

export interface MoveOptions {
  /** Move only these drawings (the failed ones, on "Try again"). */
  ids?: readonly string[]
  /** Called after each drawing with how many were handled so far. */
  onProgress?(done: number, total: number): void
}

class MoveFailed extends Error {
  readonly reason: MoveFailureReason
  constructor(reason: MoveFailureReason) {
    super(reason)
    this.reason = reason
  }
}

// Only one move at a time across tabs (Web Locks); without them, one per page.
let runningHere = false

async function exclusive<T>(work: () => Promise<T>, busy: () => T): Promise<T> {
  const locks = (globalThis.navigator as Navigator | undefined)?.locks
  if (locks) return locks.request('rabisco-move', { ifAvailable: true }, (lock) => (lock ? work() : busy()))
  if (runningHere) return busy()
  runningHere = true
  try {
    return await work()
  } finally {
    runningHere = false
  }
}

/** The editor sends URL-safe base64 without data-URL framing; the stored thumbnail is a PNG data URL. */
function toDriveThumbnail(dataUrl: string | undefined): DriveThumbnail | undefined {
  const base64 = dataUrl?.slice('data:image/png;base64,'.length)
  return base64 ? { image: base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''), mimeType: 'image/png' } : undefined
}

async function copyToDrive(drive: DriveClient, meta: StoredMeta, content: string, folderId: string): Promise<string> {
  const created = await drive.createFile(meta.name, content, folderId)
  // Recorded before anything else, so a retry after any later failure finds the copy instead of making another.
  await markMoved(meta.id, created.id)
  const thumbnail = toDriveThumbnail(meta.thumbnail)
  if (thumbnail) {
    try {
      await drive.save(created.id, content, thumbnail)
    } catch {
      // A missing preview is not worth failing the move; the next save of the drawing will make one.
    }
  }
  return created.id
}

/**
 * Whether a draft holds nothing beyond the saved drawing. Compared the way the editor does (by the
 * scene's content signature), since the same drawing serialises differently from one pass to the next.
 */
async function draftMatches(draft: Draft, content: string): Promise<boolean> {
  if (draft.json === content) return true
  try {
    // Loaded on demand: the editor's scene code pulls in Excalidraw, which the file list must not.
    const { parseScene, sceneSignature } = await import('../editor/scene')
    return sceneSignature(parseScene(draft.json)) === sceneSignature(parseScene(content))
  } catch {
    return false
  }
}

async function moveOne(drive: DriveClient, folder: () => Promise<string>, meta: StoredMeta): Promise<void> {
  const record = await readRecord(meta.id)
  if (!record || typeof record.content !== 'string') throw new MoveFailed('damaged')
  const content = record.content

  // Unsaved edits live in the draft store, not in the record: copying now would lose them.
  const draft = await getDraft(meta.id)
  if (draft && !(await draftMatches(draft, content))) throw new MoveFailed('draft')

  let driveId = record.meta.movedTo
  if (!driveId) {
    driveId = await copyToDrive(drive, record.meta, content, await folder())
  }

  let remote: string
  try {
    remote = await drive.download(driveId)
  } catch (error) {
    if (!(error instanceof DriveError) || error.kind !== 'notFound' || record.meta.movedTo !== driveId) throw error
    // The copy of an earlier attempt is gone from Drive (deleted there): make a fresh one.
    await clearMoved(meta.id)
    driveId = await copyToDrive(drive, record.meta, content, await folder())
    remote = await drive.download(driveId)
  }
  if (remote !== content) {
    // The copy is ours and stale (the drawing was edited after an earlier attempt): bring it up to date once.
    await drive.save(driveId, content)
    remote = await drive.download(driveId)
    if (remote !== content) throw new MoveFailed('mismatch')
  }

  // Only the revision that was copied may be deleted; anything saved since stays.
  if (!(await deleteIfUnchanged(meta.id, record.meta.headRevisionId, driveId))) throw new MoveFailed('changed')
  // The draft goes only if it is still the one that was checked; an edit typed meanwhile keeps it.
  if (draft) {
    const now = await getDraft(meta.id)
    if (now && now.updatedAt === draft.updatedAt && now.json === draft.json) await deleteDraft(meta.id)
  }
}

/**
 * Copies local drawings to Drive and deletes each local one only after its copy was downloaded and
 * found identical. One drawing failing never stops the others; the report says what is left.
 */
export async function moveLocalDrawings(drive: DriveClient, options: MoveOptions = {}): Promise<MoveReport> {
  const empty: MoveReport = { total: 0, moved: 0, failed: 0, failures: [], busy: false }
  return exclusive(
    async () => {
      if (!(await localDbExists())) return { ...empty }
      let metas: StoredMeta[]
      try {
        metas = (await listMetas()).filter((meta) => meta.name.toLowerCase().endsWith('.excalidraw'))
      } catch (error) {
        throw toDriveError(error)
      }
      const wanted = options.ids ? new Set(options.ids) : null
      const queue = wanted ? metas.filter((meta) => wanted.has(meta.id)) : metas

      let folderLookup: Promise<string> | null = null
      const folder = () => {
        folderLookup ??= drive.ensureFolder()
        // A failed lookup is retried for the next drawing instead of failing them all with it.
        folderLookup.catch(() => {
          folderLookup = null
        })
        return folderLookup
      }

      const report: MoveReport = { ...empty, total: queue.length, failures: [] }
      for (const meta of queue) {
        try {
          await moveOne(drive, folder, meta)
          report.moved++
        } catch (error) {
          report.failed++
          report.failures.push({ id: meta.id, name: meta.name, reason: error instanceof MoveFailed ? error.reason : 'error' })
        }
        options.onProgress?.(report.moved + report.failed, report.total)
      }
      return report
    },
    () => ({ ...empty, busy: true }),
  )
}
