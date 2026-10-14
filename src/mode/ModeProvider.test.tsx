import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IDBFactory } from 'fake-indexeddb'
import { closeLocalDb } from '../local/db'
import { ModeProvider } from './ModeProvider'
import { resetModeMemory } from './modeStorage'
import { useMode } from './useMode'

function Probe() {
  const { mode, localSupport, enterLocal, leaveLocal } = useMode()
  return (
    <>
      <p data-testid="mode">{mode}</p>
      <p data-testid="support">{localSupport}</p>
      <button type="button" onClick={enterLocal}>enter</button>
      <button type="button" onClick={leaveLocal}>leave</button>
    </>
  )
}

function renderMode() {
  return render(
    <ModeProvider>
      <Probe />
    </ModeProvider>,
  )
}

beforeEach(async () => {
  localStorage.clear()
  resetModeMemory()
  await closeLocalDb()
  globalThis.indexedDB = new IDBFactory()
})
afterEach(() => vi.restoreAllMocks())

it('starts in the google mode with support decided at once and never creates the database', async () => {
  renderMode()
  expect(screen.getByTestId('mode')).toHaveTextContent('google')
  expect(screen.getByTestId('support')).toHaveTextContent('available')
  await new Promise((resolve) => setTimeout(resolve, 30))
  expect((await indexedDB.databases()).map((db) => db.name)).not.toContain('rabisco-local')
})

it('enters the local mode, remembers it for the next visit and leaves it again', async () => {
  const user = userEvent.setup()
  const first = renderMode()
  await user.click(screen.getByRole('button', { name: 'enter' }))
  await waitFor(() => expect(screen.getByTestId('mode')).toHaveTextContent('local'))
  expect(localStorage.getItem('rabisco.mode')).toBe('local')
  expect((await indexedDB.databases()).map((db) => db.name)).toContain('rabisco-local')
  first.unmount()

  renderMode()
  expect(screen.getByTestId('mode')).toHaveTextContent('local')
  await user.click(screen.getByRole('button', { name: 'leave' }))
  expect(screen.getByTestId('mode')).toHaveTextContent('google')
  expect(localStorage.getItem('rabisco.mode')).toBeNull()
})

it('keeps the mode for the session when storage refuses it', async () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked')
  })
  const user = userEvent.setup()
  renderMode()
  await user.click(screen.getByRole('button', { name: 'enter' }))
  await waitFor(() => expect(screen.getByTestId('mode')).toHaveTextContent('local'))
})

it('does not enter the local mode when the database cannot be opened, and says it is unavailable', async () => {
  vi.spyOn(indexedDB, 'open').mockImplementation(() => {
    throw new Error('SecurityError')
  })
  const user = userEvent.setup()
  renderMode()
  await user.click(screen.getByRole('button', { name: 'enter' }))
  await waitFor(() => expect(screen.getByTestId('support')).toHaveTextContent('unavailable'))
  expect(screen.getByTestId('mode')).toHaveTextContent('google')
  expect(localStorage.getItem('rabisco.mode')).toBeNull()
})

it('reports unavailable at once when the browser has no IndexedDB', () => {
  const original = globalThis.indexedDB
  // @ts-expect-error simulating a browser without IndexedDB
  delete globalThis.indexedDB
  try {
    renderMode()
    expect(screen.getByTestId('support')).toHaveTextContent('unavailable')
  } finally {
    globalThis.indexedDB = original
  }
})

it('opens the database on load when the page starts in the local mode', async () => {
  localStorage.setItem('rabisco.mode', 'local')
  renderMode()
  await waitFor(async () => expect((await indexedDB.databases()).map((db) => db.name)).toContain('rabisco-local'))
})

it('ignores the mode another tab writes: each tab keeps its own', async () => {
  renderMode()
  localStorage.setItem('rabisco.mode', 'local')
  act(() => {
    window.dispatchEvent(new StorageEvent('storage', { key: 'rabisco.mode', newValue: 'local' }))
  })
  expect(screen.getByTestId('mode')).toHaveTextContent('google')
})

it('throws when used outside the provider', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  expect(() => render(<Probe />)).toThrow('useMode must be used inside <ModeProvider>')
})
