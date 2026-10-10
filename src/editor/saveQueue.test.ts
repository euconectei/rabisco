import { DriveError } from '../drive/errors'
import { createSaveQueue, type SaveQueueDeps, type SaveStatus } from './saveQueue'

interface Deferred { resolve(): void; reject(error: unknown): void }

function setup(options: { online?: boolean } = {}) {
  let remote = 'v1'
  let counter = 1
  let online = options.online ?? true
  let active = 0
  let maxActive = 0
  const statuses: SaveStatus[] = []
  const listeners = new Set<() => void>()
  let nextUpload: (() => Promise<void>) | null = null

  const deps: SaveQueueDeps = {
    getRemoteVersion: vi.fn(async () => remote),
    upload: vi.fn(async () => {
      active += 1
      maxActive = Math.max(maxActive, active)
      try {
        if (nextUpload) {
          const pending = nextUpload
          nextUpload = null
          await pending()
        }
        counter += 1
        remote = `v${counter}`
        return { version: remote }
      } finally {
        active -= 1
      }
    }),
    putDraft: vi.fn(async () => {}),
    deleteDraft: vi.fn(async () => {}),
    isOnline: vi.fn(() => online),
    onOnline: vi.fn((listener: () => void) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    }),
    onStatus: vi.fn((status: SaveStatus) => void statuses.push(status)),
  }

  const queue = createSaveQueue({ json: 'J0', version: 'v1' }, deps)
  return {
    queue,
    deps,
    statuses,
    last: () => statuses.at(-1),
    setRemote: (version: string) => void (remote = version),
    setOnline: (value: boolean) => void (online = value),
    fireOnline: () => [...listeners].forEach((listener) => listener()),
    listenerCount: () => listeners.size,
    maxActive: () => maxActive,
    holdNextUpload(): Deferred {
      let resolve!: () => void
      let reject!: (error: unknown) => void
      const done = new Promise<void>((res, rej) => {
        resolve = res
        reject = rej
      })
      nextUpload = () => done
      return { resolve, reject }
    },
    failNextUpload(error: unknown) {
      nextUpload = () => Promise.reject(error)
    },
  }
}

const settle = () => vi.advanceTimersByTimeAsync(0)
const wait = (ms: number) => vi.advanceTimersByTimeAsync(ms)

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

it('1. ignores a change equal to what is saved', async () => {
  const s = setup()
  s.queue.change('J0')
  await wait(5000)
  expect(s.deps.upload).not.toHaveBeenCalled()
  expect(s.statuses).toEqual([])
})

it('2. saves once, 2 s after the last change, then clears the draft', async () => {
  const s = setup()
  s.queue.change('J1')
  expect(s.last()).toBe('pending')
  await wait(1999)
  expect(s.deps.upload).not.toHaveBeenCalled()
  await wait(1)
  expect(s.deps.getRemoteVersion).toHaveBeenCalledTimes(1)
  expect(s.deps.upload).toHaveBeenCalledExactlyOnceWith('J1')
  expect(s.last()).toBe('saved')
  expect(s.deps.deleteDraft).toHaveBeenCalled()
})

it('3. coalesces quick changes into one upload of the latest scene', async () => {
  const s = setup()
  s.queue.change('J1')
  await wait(500)
  s.queue.change('J2')
  await wait(500)
  s.queue.change('J3')
  await wait(2000)
  expect(s.deps.upload).toHaveBeenCalledExactlyOnceWith('J3')
})

it('4. writes the draft at most every 500 ms, with the latest scene and the known base version', async () => {
  const s = setup()
  s.queue.change('J1')
  s.queue.change('J2')
  expect(s.deps.putDraft).not.toHaveBeenCalled()
  await wait(500)
  expect(s.deps.putDraft).toHaveBeenCalledExactlyOnceWith('J2', 'v1')
  s.queue.change('J3')
  await wait(500)
  expect(s.deps.putDraft).toHaveBeenLastCalledWith('J3', 'v1')
  expect(s.deps.putDraft).toHaveBeenCalledTimes(2)
})

it('5. saves a change made during an upload right after it, never in parallel', async () => {
  const s = setup()
  const held = s.holdNextUpload()
  s.queue.change('J1')
  await wait(2000)
  expect(s.last()).toBe('saving')
  s.queue.change('J2')
  await wait(2000)
  expect(s.deps.upload).toHaveBeenCalledTimes(1)
  held.resolve()
  await settle()
  expect(s.last()).toBe('pending')
  await wait(2000)
  expect(s.deps.upload).toHaveBeenLastCalledWith('J2')
  expect(s.deps.upload).toHaveBeenCalledTimes(2)
  expect(s.maxActive()).toBe(1)
  expect(s.last()).toBe('saved')
})

it('6. stops on a remote change and resolves it either way', async () => {
  const s = setup()
  s.setRemote('external')
  s.queue.change('J1')
  await wait(2000)
  expect(s.last()).toBe('conflict')
  expect(s.deps.upload).not.toHaveBeenCalled()

  s.queue.change('J2')
  await wait(5000)
  expect(s.last()).toBe('conflict')
  expect(s.deps.upload).not.toHaveBeenCalled()

  vi.mocked(s.deps.getRemoteVersion).mockClear()
  s.queue.keepMine()
  await settle()
  expect(s.deps.getRemoteVersion).not.toHaveBeenCalled()
  expect(s.deps.upload).toHaveBeenCalledExactlyOnceWith('J2')
  expect(s.last()).toBe('saved')
})

it('6b. accepting the remote version adopts it without uploading', async () => {
  const s = setup()
  s.setRemote('external')
  s.queue.change('J1')
  await wait(2000)
  s.queue.acceptRemote('external', 'REMOTE')
  expect(s.last()).toBe('saved')
  expect(s.deps.deleteDraft).toHaveBeenCalled()
  expect(s.queue.isDirty()).toBe(false)
  s.queue.change('J2')
  await wait(2000)
  expect(s.deps.upload).toHaveBeenCalledExactlyOnceWith('J2')
})

it('7. waits for a reconnect after an auth failure', async () => {
  const s = setup()
  s.failNextUpload(new DriveError('auth', 'expired'))
  s.queue.change('J1')
  await wait(2000)
  expect(s.last()).toBe('needs-auth')
  s.queue.change('J2')
  await wait(5000)
  expect(s.deps.upload).toHaveBeenCalledTimes(1)
  expect(s.last()).toBe('needs-auth')
  s.queue.retryNow()
  await settle()
  expect(s.deps.upload).toHaveBeenLastCalledWith('J2')
  expect(s.last()).toBe('saved')
})

it('8. waits for the network after a network failure, then saves', async () => {
  const s = setup()
  s.failNextUpload(new DriveError('network', 'offline'))
  s.queue.change('J1')
  await wait(2000)
  expect(s.last()).toBe('offline')
  s.fireOnline()
  await settle()
  expect(s.deps.upload).toHaveBeenCalledTimes(2)
  expect(s.last()).toBe('saved')
  expect(s.listenerCount()).toBe(0)
})

it('9. does not even try while the browser is offline', async () => {
  const s = setup({ online: false })
  s.queue.change('J1')
  await wait(2000)
  expect(s.last()).toBe('offline')
  expect(s.deps.getRemoteVersion).not.toHaveBeenCalled()
  expect(s.deps.upload).not.toHaveBeenCalled()
  s.setOnline(true)
  s.fireOnline()
  await settle()
  expect(s.deps.upload).toHaveBeenCalledExactlyOnceWith('J1')
})

it('10. shows an error when retries are exhausted, and retries on demand', async () => {
  const s = setup()
  s.failNextUpload(new DriveError('rateLimit', 'slow down'))
  s.queue.change('J1')
  await wait(2000)
  expect(s.last()).toBe('error')
  s.queue.retryNow()
  await settle()
  expect(s.last()).toBe('saved')
})

it('11. is dirty from the change until the upload finishes', async () => {
  const s = setup()
  expect(s.queue.isDirty()).toBe(false)
  const held = s.holdNextUpload()
  s.queue.change('J1')
  expect(s.queue.isDirty()).toBe(true)
  await wait(2000)
  expect(s.queue.isDirty()).toBe(true)
  held.resolve()
  await settle()
  expect(s.queue.isDirty()).toBe(false)
})

it('12. dispose cancels a scheduled save but keeps the pending change as a draft', async () => {
  const s = setup()
  s.queue.change('J1')
  s.queue.dispose()
  expect(s.deps.putDraft).toHaveBeenCalledExactlyOnceWith('J1', 'v1')
  await wait(5000)
  expect(s.deps.upload).not.toHaveBeenCalled()
  expect(s.deps.putDraft).toHaveBeenCalledTimes(1)
})

it('treats a failing version check like a failing upload', async () => {
  const s = setup()
  vi.mocked(s.deps.getRemoteVersion).mockRejectedValueOnce(new DriveError('notFound', 'gone'))
  s.queue.change('J1')
  await wait(2000)
  expect(s.last()).toBe('error')
  expect(s.deps.upload).not.toHaveBeenCalled()
})

it('keeps retrying while offline even if the online event never fires (Wi-Fi without internet)', async () => {
  const s = setup()
  s.failNextUpload(new DriveError('network', 'offline'))
  s.queue.change('J1')
  await wait(2000)
  expect(s.last()).toBe('offline')
  await wait(5000)
  expect(s.deps.upload).toHaveBeenCalledTimes(2)
  expect(s.last()).toBe('saved')
  expect(s.listenerCount()).toBe(0)
})

it('backs off between offline retries', async () => {
  const s = setup({ online: false })
  s.queue.change('J1')
  await wait(2000)
  expect(s.last()).toBe('offline')
  await wait(5000) // first retry: still offline, nothing sent
  expect(s.deps.upload).not.toHaveBeenCalled()
  s.setOnline(true)
  await wait(9000) // the second retry waits 10 s
  expect(s.deps.upload).not.toHaveBeenCalled()
  await wait(1000)
  expect(s.deps.upload).toHaveBeenCalledExactlyOnceWith('J1')
})

it('retries on demand while offline', async () => {
  const s = setup()
  s.failNextUpload(new DriveError('network', 'offline'))
  s.queue.change('J1')
  await wait(2000)
  s.queue.retryNow()
  await settle()
  expect(s.last()).toBe('saved')
  await wait(60_000)
  expect(s.deps.upload).toHaveBeenCalledTimes(2)
})

it('does not claim "saved" when a change lands while the draft is being cleared', async () => {
  const s = setup()
  let releaseDelete!: () => void
  vi.mocked(s.deps.deleteDraft).mockImplementationOnce(() => new Promise<void>((resolve) => (releaseDelete = resolve)))
  s.queue.change('J1')
  await wait(2000)
  s.queue.change('J2')
  releaseDelete()
  await settle()
  expect(s.last()).toBe('pending')
  await wait(2000)
  expect(s.deps.upload).toHaveBeenLastCalledWith('J2')
  expect(s.last()).toBe('saved')
})
