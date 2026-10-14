import 'fake-indexeddb/auto'
import { getDraft, putDraft } from '../editor/drafts'
import { clearDriveDrafts } from './clearDrafts'

const draft = (fileId: string) => ({ fileId, json: '{}', baseVersion: 'r', updatedAt: 1 })

it('forgets the drafts of Drive files but keeps those of drawings kept in this browser', async () => {
  await putDraft(draft('drive-file'))
  await putDraft(draft('local-1234'))
  await clearDriveDrafts()
  await expect(getDraft('drive-file')).resolves.toBeNull()
  await expect(getDraft('local-1234')).resolves.toMatchObject({ fileId: 'local-1234' })
})

it('does nothing, and does not throw, when there are no drafts', async () => {
  await clearDriveDrafts()
  await expect(clearDriveDrafts()).resolves.toBeUndefined()
})
