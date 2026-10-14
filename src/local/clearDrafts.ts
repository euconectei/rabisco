import { createStore, del, keys, type UseStore } from 'idb-keyval'
import { isLocalId } from './ids'

let store: UseStore | null = null

/**
 * Forgets the unsaved edits of Drive files on sign-out, so a shared computer keeps nothing of the
 * account behind. Drafts of drawings kept only in this browser stay: the drawing itself stays too,
 * and signing out is not a request to delete it.
 */
export async function clearDriveDrafts(): Promise<void> {
  try {
    store ??= createStore('rabisco', 'drafts')
    const open = store
    for (const key of await keys(open)) {
      if (typeof key === 'string' && isLocalId(key)) continue
      await del(key, open)
    }
  } catch {
    // Drafts are a safety net; failing to clear them must never block signing out.
    store = null
  }
}
