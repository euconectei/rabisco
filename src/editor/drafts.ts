import { clear, createStore, del, get, set, type UseStore } from 'idb-keyval'

// Unsaved edits per Drive file. Drafts are a safety net: any IndexedDB failure is swallowed so it
// can never break the editor.
export interface Draft {
  fileId: string
  json: string
  baseVersion: string
  updatedAt: number
}

let store: UseStore | null = null

function draftsStore(): UseStore {
  store ??= createStore('rabisco', 'drafts')
  return store
}

async function safely<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await operation()
  } catch {
    store = null
    return fallback
  }
}

export function putDraft(draft: Draft): Promise<void> {
  return safely(() => set(draft.fileId, draft, draftsStore()), undefined)
}

export async function getDraft(fileId: string): Promise<Draft | null> {
  return safely(async () => (await get<Draft>(fileId, draftsStore())) ?? null, null)
}

export function deleteDraft(fileId: string): Promise<void> {
  return safely(() => del(fileId, draftsStore()), undefined)
}

/** Forgets every local draft (on sign-out, so a shared computer keeps nothing behind). */
export function clearDrafts(): Promise<void> {
  return safely(() => clear(draftsStore()), undefined)
}
