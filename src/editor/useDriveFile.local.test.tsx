import 'vitest-canvas-mock'
import 'fake-indexeddb/auto'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { AuthContext } from '../auth/context'
import { DriveContext } from '../drive/context'
import { createLocalDriveClient } from '../local/client'
import { signedInAuth } from '../test/renderWithProviders'
import { emptySceneJson } from './scene'
import { rememberOrigin, resetReturnedForTests } from '../usage/track'
import { useDriveFile } from './useDriveFile'

afterEach(() => vi.restoreAllMocks())

it('saves a local drawing into the browser even when the network is down', async () => {
  const local = createLocalDriveClient()
  const file = await local.createFile('Off', emptySceneJson(), 'local')
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AuthContext.Provider value={signedInAuth({ status: 'signed-out', user: null })}>
      <DriveContext.Provider value={local}>{children}</DriveContext.Provider>
    </AuthContext.Provider>
  )
  const { result } = renderHook(() => useDriveFile(file.id), { wrapper })
  await waitFor(() => expect(result.current.load.kind).toBe('ready'))

  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
  act(() => result.current.onSceneChange([], { viewBackgroundColor: '#ff0000' } as never, {}))

  await waitFor(() => expect(result.current.status).toBe('saved'), { timeout: 8000 })
  await expect(local.download(file.id)).resolves.toContain('#ff0000')
}, 12000)

it('counts a return to edit when a drawing last changed on another day is saved', async () => {
  resetReturnedForTests()
  const beacon = vi.fn<(url: string, data: Blob) => boolean>(() => true)
  Object.defineProperty(navigator, 'sendBeacon', { value: beacon, configurable: true })
  const local = createLocalDriveClient()
  const file = await local.createFile('Ontem', emptySceneJson(), 'local')
  rememberOrigin(file.id, 'resumo')
  const yesterday = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString()
  const getMeta = local.getMeta.bind(local)
  vi.spyOn(local, 'getMeta').mockImplementation(async (id) => ({ ...(await getMeta(id)), modifiedTime: yesterday }))
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AuthContext.Provider value={signedInAuth({ status: 'signed-out', user: null })}>
      <DriveContext.Provider value={local}>{children}</DriveContext.Provider>
    </AuthContext.Provider>
  )
  const { result } = renderHook(() => useDriveFile(file.id), { wrapper })
  await waitFor(() => expect(result.current.load.kind).toBe('ready'))
  act(() => result.current.onSceneChange([], { viewBackgroundColor: '#00ff00' } as never, {}))
  await waitFor(() => expect(beacon).toHaveBeenCalledTimes(1), { timeout: 8000 })
  expect(JSON.parse(await beacon.mock.calls[0][1].text())).toEqual({ type: 'drawing_returned', template: 'resumo', mode: 'local', lang: 'pt-BR' })
}, 12000)
