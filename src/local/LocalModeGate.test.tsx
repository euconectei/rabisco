import { screen, waitFor } from '@testing-library/react'
import { useLocation } from 'react-router-dom'
import { renderWithProviders, signedInAuth } from '../test/renderWithProviders'
import { LocalModeGate } from './LocalModeGate'
import { markMoveOfferAnswered, moveOfferAnswered, resetMoveOffer } from './move'

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>
}

function setup(mode: 'google' | 'local', auth = signedInAuth(), route = '/edit/local-1') {
  const leaveLocal = vi.fn()
  renderWithProviders(
    <LocalModeGate>
      <Where />
    </LocalModeGate>,
    { mode, auth, route, modeValue: { leaveLocal } },
  )
  return { leaveLocal }
}

beforeEach(() => {
  resetMoveOffer()
  sessionStorage.clear()
})

it('ends the local mode when the person signs in, goes to the files and asks for a fresh offer', async () => {
  markMoveOfferAnswered()
  const { leaveLocal } = setup('local')
  await waitFor(() => expect(leaveLocal).toHaveBeenCalledTimes(1))
  expect(screen.getByTestId('where')).toHaveTextContent('/app')
  expect(moveOfferAnswered()).toBe(false)
})

it('does nothing while signed out in the local mode', () => {
  const { leaveLocal } = setup('local', signedInAuth({ status: 'signed-out', user: null }))
  expect(leaveLocal).not.toHaveBeenCalled()
  expect(screen.getByTestId('where')).toHaveTextContent('/edit/local-1')
})

it('does nothing in the Google mode', () => {
  const { leaveLocal } = setup('google')
  expect(leaveLocal).not.toHaveBeenCalled()
  expect(screen.getByTestId('where')).toHaveTextContent('/edit/local-1')
})
