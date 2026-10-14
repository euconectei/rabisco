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

it('starts in the google mode and finds the local storage available', async () => {
  renderMode()
  expect(screen.getByTestId('mode')).toHaveTextContent('google')
  expect(screen.getByTestId('support')).toHaveTextContent('checking')
  await waitFor(() => expect(screen.getByTestId('support')).toHaveTextContent('available'))
})

it('enters the local mode, remembers it for the next visit and leaves it again', async () => {
  const user = userEvent.setup()
  const first = renderMode()
  await waitFor(() => expect(screen.getByTestId('support')).toHaveTextContent('available'))
  await user.click(screen.getByRole('button', { name: 'enter' }))
  expect(screen.getByTestId('mode')).toHaveTextContent('local')
  expect(localStorage.getItem('rabisco.mode')).toBe('local')
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
  expect(screen.getByTestId('mode')).toHaveTextContent('local')
})

it('reports the local storage as unavailable and refuses to enter the local mode', async () => {
  vi.spyOn(indexedDB, 'open').mockImplementation(() => {
    throw new Error('SecurityError')
  })
  const user = userEvent.setup()
  renderMode()
  await waitFor(() => expect(screen.getByTestId('support')).toHaveTextContent('unavailable'))
  await user.click(screen.getByRole('button', { name: 'enter' }))
  expect(screen.getByTestId('mode')).toHaveTextContent('google')
  expect(localStorage.getItem('rabisco.mode')).toBeNull()
})

it('follows another tab that enters or leaves the local mode', async () => {
  renderMode()
  localStorage.setItem('rabisco.mode', 'local')
  act(() => {
    window.dispatchEvent(new StorageEvent('storage', { key: 'rabisco.mode', newValue: 'local' }))
  })
  expect(screen.getByTestId('mode')).toHaveTextContent('local')
  localStorage.removeItem('rabisco.mode')
  act(() => {
    window.dispatchEvent(new StorageEvent('storage', { key: 'rabisco.mode', newValue: null }))
  })
  expect(screen.getByTestId('mode')).toHaveTextContent('google')
})

it('throws when used outside the provider', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  expect(() => render(<Probe />)).toThrow('useMode must be used inside <ModeProvider>')
})
