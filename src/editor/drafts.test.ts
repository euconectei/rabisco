import 'fake-indexeddb/auto'
import { clearDrafts, deleteDraft, getDraft, putDraft, type Draft } from './drafts'

const draft: Draft = { fileId: 'f1', json: '{"type":"excalidraw"}', baseVersion: '7', updatedAt: 1760000000000 }

afterEach(() => vi.restoreAllMocks())

it('stores and reads a draft by file id', async () => {
  await putDraft(draft)
  await expect(getDraft('f1')).resolves.toEqual(draft)
})

it('returns null for files without a draft', async () => {
  await expect(getDraft('nope')).resolves.toBeNull()
})

it('deletes a draft', async () => {
  await putDraft({ ...draft, fileId: 'f2' })
  await deleteDraft('f2')
  await expect(getDraft('f2')).resolves.toBeNull()
})

it('clears every draft (on sign-out, for shared computers)', async () => {
  await putDraft({ ...draft, fileId: 'x1' })
  await putDraft({ ...draft, fileId: 'x2' })
  await clearDrafts()
  await expect(getDraft('x1')).resolves.toBeNull()
  await expect(getDraft('x2')).resolves.toBeNull()
})

it('never rejects when IndexedDB is broken', async () => {
  vi.spyOn(indexedDB, 'open').mockImplementation(() => {
    throw new Error('InvalidStateError')
  })
  vi.resetModules() // a fresh module, so the database is opened (and fails) again
  const fresh = await import('./drafts')
  await expect(fresh.putDraft({ ...draft, fileId: 'f3' })).resolves.toBeUndefined()
  await expect(fresh.getDraft('f3')).resolves.toBeNull()
  await expect(fresh.deleteDraft('f3')).resolves.toBeUndefined()
})
