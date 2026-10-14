import 'vitest-canvas-mock'
import 'fake-indexeddb/auto'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { AuthContext } from '../auth/context'
import { DriveContext } from '../drive/context'
import { createLocalDriveClient } from '../local/client'
import { signedInAuth } from '../test/renderWithProviders'
import { emptySceneJson } from './scene'
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
