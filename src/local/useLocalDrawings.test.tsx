import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { LocalDriveContext } from './context'
import { memoryDrive } from '../test/memoryDrive'
import { useLocalDrawings } from './useLocalDrawings'

const localDbExists = vi.hoisted(() => vi.fn())
vi.mock('./db', async (importOriginal) => ({ ...(await importOriginal<typeof import('./db')>()), localDbExists }))

function setup() {
  const local = memoryDrive([{ id: 'local-1', name: 'A.excalidraw', content: '{}' }])
  const wrapper = ({ children }: { children: ReactNode }) => <LocalDriveContext.Provider value={local.client}>{children}</LocalDriveContext.Provider>
  return { local, ...renderHook(() => useLocalDrawings(), { wrapper }) }
}

it('does not touch the local storage, so it is never created, for someone who only uses the Drive', async () => {
  localDbExists.mockResolvedValue(false)
  const { local, result } = setup()
  await waitFor(() => expect(result.current.drawings).toEqual({ kind: 'ready', files: [] }))
  expect(local.client.listFiles).not.toHaveBeenCalled()
})

it('lists the drawings when the local storage exists', async () => {
  localDbExists.mockResolvedValue(true)
  const { result } = setup()
  await waitFor(() => expect(result.current.drawings.kind).toBe('ready'))
  expect(result.current.drawings).toMatchObject({ files: [{ id: 'local-1' }] })
})
