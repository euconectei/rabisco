import { DriveError } from './errors'
import type { DriveFetch } from './http'
import { buildMultipart } from './multipart'

export const EXCALIDRAW_MIME = 'application/vnd.excalidraw+json'
export const FOLDER_MIME = 'application/vnd.google-apps.folder'
export const FOLDER_NAME = 'Rabisco'
const EXTENSION = '.excalidraw'

const MAX_LIST_PAGES = 10

function withFolderLock<T>(work: () => Promise<T>): Promise<T> {
  const locks = (globalThis.navigator as Navigator | undefined)?.locks
  return locks ? locks.request('rabisco-folder', work) : work()
}

const API = 'https://www.googleapis.com/drive/v3'
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3'
const META_FIELDS = 'id,name,version,headRevisionId,modifiedTime,parents'

export interface DriveFileMeta {
  id: string
  name: string
  version: string
  /** Changes only when the content changes (unlike `version`, which moves on any metadata change). */
  headRevisionId?: string
  modifiedTime: string
  parents?: string[]
}

/** The token used to detect edits made elsewhere: the content revision, falling back to `version`. */
export function contentRevision(meta: DriveFileMeta): string {
  return meta.headRevisionId ?? `v${meta.version}`
}

export interface DriveThumbnail {
  image: string // base64 URL-safe PNG
  mimeType: 'image/png'
}

export interface DriveClient {
  ensureFolder(): Promise<string>
  listFiles(): Promise<DriveFileMeta[]>
  createFile(name: string, content: string, folderId: string): Promise<DriveFileMeta>
  getMeta(id: string): Promise<DriveFileMeta>
  download(id: string): Promise<string>
  save(id: string, content: string, thumbnail?: DriveThumbnail): Promise<DriveFileMeta>
  rename(id: string, name: string): Promise<DriveFileMeta>
  createSibling(name: string, content: string, mimeType: string, nearFileId: string): Promise<DriveFileMeta>
}

export interface FolderCache {
  get(): string | null
  set(id: string): void
}

const FOLDER_CACHE_KEY = 'rabisco.folderId'

export const localFolderCache: FolderCache = {
  get() {
    try {
      return localStorage.getItem(FOLDER_CACHE_KEY)
    } catch {
      return null
    }
  },
  set(id) {
    try {
      localStorage.setItem(FOLDER_CACHE_KEY, id)
    } catch {
      // Storage unavailable: the folder is looked up again next time.
    }
  },
}

function url(base: string, path: string, params: Record<string, string>): string {
  return `${base}${path}?${new URLSearchParams(params).toString()}`
}

function withExtension(name: string): string {
  const trimmed = name.trim()
  return trimmed.toLowerCase().endsWith(EXTENSION) ? trimmed : `${trimmed}${EXTENSION}`
}

function isExcalidrawName(name: string): boolean {
  return name.toLowerCase().endsWith(EXTENSION)
}

export function createDriveClient(driveFetch: DriveFetch, folderCache: FolderCache = localFolderCache): DriveClient {
  async function json<T>(target: string, init?: RequestInit): Promise<T> {
    const response = await driveFetch(target, init)
    return (await response.json()) as T
  }

  function upload(method: 'POST' | 'PATCH', path: string, metadata: object, content: string, mimeType: string) {
    const multipart = buildMultipart(metadata, content, mimeType)
    return json<DriveFileMeta>(url(UPLOAD, path, { uploadType: 'multipart', fields: META_FIELDS }), {
      method,
      headers: { 'Content-Type': multipart.contentType },
      body: multipart.body,
    })
  }

  async function cachedFolderIsUsable(id: string): Promise<boolean> {
    try {
      const folder = await json<{ trashed?: boolean }>(url(API, `/files/${id}`, { fields: 'id,trashed' }))
      return !folder.trashed
    } catch (error) {
      if (error instanceof DriveError && (error.kind === 'notFound' || error.kind === 'forbidden')) return false
      throw error
    }
  }

  let folderLookup: Promise<string> | null = null

  async function findOrCreateFolder(): Promise<string> {
      const cached = folderCache.get()
      if (cached && (await cachedFolderIsUsable(cached))) return cached
      const query = `mimeType='${FOLDER_MIME}' and name='${FOLDER_NAME}' and trashed=false`
      const found = await json<{ files: Array<{ id: string }> }>(url(API, '/files', { q: query, fields: 'files(id)' }))
      let id = found.files[0]?.id
      if (!id) {
        const created = await json<{ id: string }>(url(API, '/files', { fields: 'id' }), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: FOLDER_NAME, mimeType: FOLDER_MIME }),
        })
        id = created.id
      }
      folderCache.set(id)
      return id
  }

  const client: DriveClient = {
    ensureFolder() {
      // One lookup at a time (in this tab, and across tabs through the Web Locks API when
      // available), so first use never creates two "Rabisco" folders.
      folderLookup ??= withFolderLock(findOrCreateFolder).finally(() => {
        folderLookup = null
      })
      return folderLookup
    },

    async listFiles() {
      const files: DriveFileMeta[] = []
      let pageToken: string | undefined
      for (let page = 0; page < MAX_LIST_PAGES; page++) {
        const result = await json<{ files: DriveFileMeta[]; nextPageToken?: string }>(
          url(API, '/files', {
            q: `trashed=false and mimeType!='${FOLDER_MIME}'`,
            orderBy: 'modifiedTime desc',
            pageSize: '100',
            fields: 'nextPageToken,files(id,name,version,modifiedTime)',
            ...(pageToken ? { pageToken } : {}),
          }),
        )
        files.push(...result.files.filter((file) => isExcalidrawName(file.name)))
        pageToken = result.nextPageToken
        if (!pageToken) break
      }
      return files
    },

    createFile(name, content, folderId) {
      return upload('POST', '/files', { name: withExtension(name), mimeType: EXCALIDRAW_MIME, parents: [folderId] }, content, EXCALIDRAW_MIME)
    },

    getMeta(id) {
      return json<DriveFileMeta>(url(API, `/files/${id}`, { fields: META_FIELDS }))
    },

    async download(id) {
      const response = await driveFetch(url(API, `/files/${id}`, { alt: 'media' }))
      return response.text()
    },

    save(id, content, thumbnail) {
      const metadata = thumbnail ? { contentHints: { thumbnail } } : {}
      return upload('PATCH', `/files/${id}`, metadata, content, EXCALIDRAW_MIME)
    },

    rename(id, name) {
      return json<DriveFileMeta>(url(API, `/files/${id}`, { fields: META_FIELDS }), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: withExtension(name) }),
      })
    },

    async createSibling(name, content, mimeType, nearFileId) {
      const near = await client.getMeta(nearFileId)
      const parents = near.parents?.length ? near.parents : [await client.ensureFolder()]
      return upload('POST', '/files', { name, mimeType, parents }, content, mimeType)
    },
  }
  return client
}
