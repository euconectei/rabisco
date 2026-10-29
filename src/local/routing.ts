import type { DriveClient } from '../drive/client'
import { LOCAL_FOLDER_ID } from './client'
import { isLocalId } from './ids'

/**
 * One client for both worlds: calls about a drawing go where that drawing lives (a `local-…` id is in
 * this browser, anything else is in Drive); listing and folder lookups are about Drive.
 */
export function createRoutingClient(local: DriveClient, remote: DriveClient): DriveClient {
  const byId = (id: string) => (isLocalId(id) ? local : remote)
  return {
    ensureFolder: () => remote.ensureFolder(),
    listFiles: () => remote.listFiles(),
    createFile: (name, content, folderId) => (folderId === LOCAL_FOLDER_ID ? local : remote).createFile(name, content, folderId),
    getMeta: (id) => byId(id).getMeta(id),
    download: (id) => byId(id).download(id),
    save: (id, content, thumbnail) => byId(id).save(id, content, thumbnail),
    rename: (id, name) => byId(id).rename(id, name),
    trash: (id) => byId(id).trash(id),
    createSibling: (name, content, mimeType, nearFileId) => byId(nearFileId).createSibling(name, content, mimeType, nearFileId),
  }
}
