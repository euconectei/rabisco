import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import type { AppState, BinaryFiles } from '@excalidraw/excalidraw/types'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { contentRevision, type DriveFileMeta } from '../drive/client'
import { DriveError } from '../drive/errors'
import { useDrive } from '../drive/useDrive'
import { deleteDraft, getDraft, putDraft } from './drafts'
import { createSaveQueue, type SaveQueue, type SaveStatus } from './saveQueue'
import { parseScene, sceneSignature, serializeScene, type SceneData } from './scene'
import { renderThumbnail } from './thumbnail'

export type OpenErrorReason = 'notFound' | 'forbidden' | 'invalidFile' | 'network' | 'unknown'

export type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; reason: OpenErrorReason }
  | { kind: 'draft' }
  | { kind: 'ready' }

function reasonOf(error: unknown): OpenErrorReason {
  const kind = error instanceof DriveError ? error.kind : 'unknown'
  return kind === 'notFound' || kind === 'forbidden' || kind === 'invalidFile' || kind === 'network' ? kind : 'unknown'
}

const isGone = (error: unknown) => error instanceof DriveError && (error.kind === 'notFound' || error.kind === 'forbidden')

function parseOrNull(json: string): SceneData | null {
  try {
    return parseScene(json)
  } catch {
    return null
  }
}

interface PendingDraft {
  draftJson: string
  /** Revision the draft was edited on; restoring starts from it so edits made elsewhere conflict. */
  draftBaseVersion: string
  remoteJson: string
  remoteScene: SceneData
  version: string
}

// Opens a Drive file in the editor and keeps it saved: load + draft check, then a save queue fed by
// every scene change. See saveQueue.ts for the saving rules. Mount it once per file id (the editor
// is keyed by fileId), so state never leaks from one file to the next.
export function useDriveFile(fileId: string) {
  const drive = useDrive()
  const auth = useAuth()
  const [load, setLoad] = useState<LoadState>({ kind: 'loading' })
  const [meta, setMeta] = useState<DriveFileMeta | null>(null)
  const [scene, setScene] = useState<SceneData | null>(null)
  const [sceneKey, setSceneKey] = useState(0)
  const [status, setStatus] = useState<SaveStatus>('saved')
  const [lost, setLost] = useState(false)
  const queue = useRef<SaveQueue | null>(null)
  const latest = useRef<{ json: string; scene: SceneData } | null>(null)
  const pendingDraft = useRef<PendingDraft | null>(null)

  const startQueue = useCallback(
    (json: string, version: string) => {
      queue.current?.dispose()
      const remember = async <T,>(operation: () => Promise<T>) => {
        try {
          const result = await operation()
          setLost(false)
          return result
        } catch (error) {
          if (isGone(error)) setLost(true)
          throw error
        }
      }
      queue.current = createSaveQueue(
        { json, version },
        {
          getRemoteVersion: () => remember(async () => contentRevision(await drive.getMeta(fileId))),
          upload: (uploadJson) =>
            remember(async () => {
              const current = latest.current?.json === uploadJson ? latest.current.scene : parseScene(uploadJson)
              const thumbnail = (await renderThumbnail(current).catch(() => null)) ?? undefined
              const saved = await drive.save(fileId, uploadJson, thumbnail)
              setMeta(saved)
              return { version: contentRevision(saved) }
            }),
          putDraft: (draftJson, baseVersion) => putDraft({ fileId, json: draftJson, baseVersion, updatedAt: Date.now() }),
          deleteDraft: () => deleteDraft(fileId),
          isOnline: () => navigator.onLine,
          onOnline: (listener) => {
            window.addEventListener('online', listener)
            return () => window.removeEventListener('online', listener)
          },
          onStatus: setStatus,
        },
      )
    },
    [drive, fileId],
  )

  const showScene = useCallback((next: SceneData, json: string) => {
    latest.current = { json, scene: next }
    setScene(next)
    setSceneKey((key) => key + 1)
  }, [])

  const becomeReady = useCallback(
    (remoteScene: SceneData, remoteJson: string, version: string) => {
      showScene(remoteScene, remoteJson)
      startQueue(remoteJson, version)
      setStatus('saved')
      setLoad({ kind: 'ready' })
    },
    [showScene, startQueue],
  )

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [fileMeta, text] = await Promise.all([drive.getMeta(fileId), drive.download(fileId)])
        const remoteScene = parseScene(text)
        const remoteJson = serializeScene(remoteScene)
        const draft = await getDraft(fileId)
        if (cancelled) return
        setMeta(fileMeta)
        const draftScene = draft ? parseOrNull(draft.json) : null
        if (draft && draftScene && sceneSignature(draftScene) !== sceneSignature(remoteScene)) {
          pendingDraft.current = {
            draftJson: serializeScene(draftScene),
            draftBaseVersion: draft.baseVersion,
            remoteJson,
            remoteScene,
            version: contentRevision(fileMeta),
          }
          setLoad({ kind: 'draft' })
          return
        }
        if (draft) void deleteDraft(fileId)
        becomeReady(remoteScene, remoteJson, contentRevision(fileMeta))
      } catch (error) {
        if (!cancelled) setLoad({ kind: 'error', reason: reasonOf(error) })
      }
    })()
    return () => {
      cancelled = true
      queue.current?.dispose()
      queue.current = null
    }
  }, [becomeReady, drive, fileId])

  // After "Reconnect" succeeds, retry what the expired session blocked.
  const previousAuth = useRef(auth.status)
  useEffect(() => {
    if (previousAuth.current !== 'signed-in' && auth.status === 'signed-in' && status === 'needs-auth') {
      queue.current?.retryNow()
    }
    previousAuth.current = auth.status
  }, [auth.status, status])

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (queue.current?.isDirty()) event.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  const restoreDraft = useCallback(() => {
    const pending = pendingDraft.current
    if (!pending) return
    pendingDraft.current = null
    becomeReady(parseScene(pending.draftJson), pending.remoteJson, pending.draftBaseVersion)
    showScene(parseScene(pending.draftJson), pending.draftJson)
    queue.current?.change(pending.draftJson)
  }, [becomeReady, showScene])

  const discardDraft = useCallback(() => {
    const pending = pendingDraft.current
    if (!pending) return
    pendingDraft.current = null
    void deleteDraft(fileId)
    becomeReady(pending.remoteScene, pending.remoteJson, pending.version)
  }, [becomeReady, fileId])

  const onSceneChange = useCallback(
    (elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
      const next: SceneData = { elements, appState, files }
      const json = serializeScene(next)
      latest.current = { json, scene: next }
      queue.current?.change(json)
    },
    [],
  )

  const useRemote = useCallback(async () => {
    const [fileMeta, text] = await Promise.all([drive.getMeta(fileId), drive.download(fileId)])
    const remoteScene = parseScene(text)
    const remoteJson = serializeScene(remoteScene)
    queue.current?.acceptRemote(contentRevision(fileMeta), remoteJson)
    setMeta(fileMeta)
    showScene(remoteScene, remoteJson)
  }, [drive, fileId, showScene])

  const rename = useCallback(
    async (name: string) => {
      const trimmed = name.trim()
      const currentName = meta?.name.replace(/\.excalidraw$/i, '')
      if (!trimmed || trimmed === currentName) return
      try {
        // Renaming does not touch the content revision, so the conflict check is unaffected.
        setMeta(await drive.rename(fileId, trimmed))
      } catch {
        // Keep the old name; the title field resets from meta.
      }
    },
    [drive, fileId, meta?.name],
  )

  return {
    load,
    meta,
    scene,
    sceneKey,
    status,
    lost,
    restoreDraft,
    discardDraft,
    onSceneChange,
    keepMine: () => queue.current?.keepMine(),
    useRemote,
    retry: () => queue.current?.retryNow(),
    rename,
    currentJson: () => latest.current?.json ?? null,
  }
}
