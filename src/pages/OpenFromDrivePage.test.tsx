import { screen, waitFor } from '@testing-library/react'
import { useLocation } from 'react-router-dom'
import { OpenFromDrivePage, parseOpenState } from './OpenFromDrivePage'
import { renderWithProviders } from '../test/renderWithProviders'
import { Route, Routes } from 'react-router-dom'

it.each([
  ['{"ids":["abc"],"action":"open","userId":"1"}', 'abc'],
  ['{"ids":[],"action":"open"}', null],
  ['{"action":"open"}', null],
  ['{"ids":[42]}', null],
  ['{broken', null],
  [null, null],
])('parseOpenState(%s) → %s', (raw, expected) => {
  expect(parseOpenState(raw)).toBe(expected)
})

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>
}

it('sends Drive "Open with" straight to the editor', async () => {
  const state = encodeURIComponent('{"ids":["abc"],"action":"open"}')
  renderWithProviders(
    <Routes>
      <Route path="/open" element={<OpenFromDrivePage />} />
      <Route path="*" element={<Where />} />
    </Routes>,
    { route: `/open?state=${state}` },
  )
  await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/edit/abc'))
})

it('explains when the Drive link is not usable', () => {
  renderWithProviders(<OpenFromDrivePage />, { route: '/open?state=nope' })
  expect(screen.getByText('Não conseguimos abrir este arquivo pelo Drive.')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Meus arquivos' })).toHaveAttribute('href', '/app')
})
