// Decides when and how the open drawing is saved to Drive: 2 s after the last change, one upload
// at a time, never overwriting a newer remote version without asking, and holding changes while
// offline or signed out. Pure (no React, no Drive): everything external comes in through deps.
export type SaveStatus = 'saved' | 'pending' | 'saving' | 'offline' | 'conflict' | 'needs-auth' | 'error'

export interface SaveQueueDeps {
  getRemoteVersion(): Promise<string>
  /** Uploads the scene (with its thumbnail); errors are DriveErrors. */
  upload(json: string): Promise<{ version: string }>
  putDraft(json: string, baseVersion: string): Promise<void>
  deleteDraft(): Promise<void>
  isOnline(): boolean
  /** Subscribes to the browser coming back online; returns the unsubscribe function. */
  onOnline(listener: () => void): () => void
  onStatus(status: SaveStatus): void
  debounceMs?: number
  /** Drafts are written at most this often (default 500 ms), always with the latest scene. */
  draftIntervalMs?: number
}

export interface SaveQueue {
  change(json: string): void
  /** Resolves a conflict by overwriting the remote file with the local scene. */
  keepMine(): void
  /** Resolves a conflict by adopting the remote version (the editor reloads that scene). */
  acceptRemote(version: string, json: string): void
  /** After "Reconnect" or "Try again". */
  retryNow(): void
  isDirty(): boolean
  dispose(): void
}

type Blocked = 'conflict' | 'needs-auth' | 'offline' | 'error'

// While offline, retry on these delays too: the browser's "online" event never fires when the
// network is up but the internet is not (captive portal, Wi-Fi without internet).
export const OFFLINE_RETRY_MS = [5000, 10000, 20000, 30000] as const

export function createSaveQueue(initial: { json: string; version: string }, deps: SaveQueueDeps): SaveQueue {
  const debounceMs = deps.debounceMs ?? 2000
  const draftIntervalMs = deps.draftIntervalMs ?? 500
  let savedJson = initial.json
  let knownVersion = initial.version
  let latestJson = initial.json
  let timer: ReturnType<typeof setTimeout> | null = null
  let inFlight = false
  let blocked: Blocked | null = null
  let removeOnline: (() => void) | null = null
  let offlineTimer: ReturnType<typeof setTimeout> | null = null
  let draftTimer: ReturnType<typeof setTimeout> | null = null
  let offlineAttempts = 0

  function schedule() {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      void flush()
    }, debounceMs)
  }

  function writeDraftNow() {
    if (draftTimer) clearTimeout(draftTimer)
    draftTimer = null
    if (latestJson !== savedJson) void deps.putDraft(latestJson, knownVersion)
  }

  function scheduleDraft() {
    draftTimer ??= setTimeout(writeDraftNow, draftIntervalMs)
  }

  function cancelDraft() {
    if (draftTimer) clearTimeout(draftTimer)
    draftTimer = null
  }

  function block(reason: Blocked) {
    blocked = reason
    deps.onStatus(reason)
  }

  function stopWaitingForNetwork() {
    removeOnline?.()
    removeOnline = null
    if (offlineTimer) clearTimeout(offlineTimer)
    offlineTimer = null
  }

  function waitForNetwork() {
    block('offline')
    stopWaitingForNetwork()
    const tryAgain = () => {
      stopWaitingForNetwork()
      blocked = null
      void flush()
    }
    removeOnline = deps.onOnline(tryAgain)
    const delay = OFFLINE_RETRY_MS[Math.min(offlineAttempts, OFFLINE_RETRY_MS.length - 1)]
    offlineAttempts += 1
    offlineTimer = setTimeout(tryAgain, delay)
  }

  function handleError(error: unknown) {
    const kind = (error as { kind?: string } | null)?.kind
    if (kind === 'network') return waitForNetwork()
    block(kind === 'auth' ? 'needs-auth' : 'error')
  }

  async function flush(force = false) {
    if (inFlight || latestJson === savedJson) return
    if (blocked && !force) return
    if (!deps.isOnline()) return waitForNetwork()
    inFlight = true
    const json = latestJson
    deps.onStatus('saving')
    try {
      if (!force) {
        const remote = await deps.getRemoteVersion()
        if (remote !== knownVersion) return block('conflict')
      }
      const { version } = await deps.upload(json)
      knownVersion = version
      savedJson = json
      blocked = null
      offlineAttempts = 0
      if (latestJson === savedJson) {
        cancelDraft()
        await deps.deleteDraft()
      }
      // Re-check: a change may have landed while the draft was being cleared.
      if (latestJson === savedJson) {
        deps.onStatus('saved')
      } else {
        deps.onStatus('pending')
        schedule()
      }
    } catch (error) {
      handleError(error)
    } finally {
      inFlight = false
    }
  }

  return {
    change(json) {
      if (json === latestJson) return
      latestJson = json
      scheduleDraft()
      if (blocked) return deps.onStatus(blocked)
      deps.onStatus('pending')
      schedule()
    },
    keepMine() {
      blocked = null
      void flush(true)
    },
    acceptRemote(version, json) {
      if (timer) clearTimeout(timer)
      timer = null
      knownVersion = version
      savedJson = json
      latestJson = json
      blocked = null
      cancelDraft()
      void deps.deleteDraft()
      deps.onStatus('saved')
    },
    retryNow() {
      stopWaitingForNetwork()
      blocked = null
      void flush()
    },
    isDirty: () => latestJson !== savedJson,
    dispose() {
      if (timer) clearTimeout(timer)
      timer = null
      stopWaitingForNetwork()
      // Leaving the editor with unsaved changes: keep them as a draft, offered on the next open.
      writeDraftNow()
    },
  }
}
