import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useLocation } from 'react-router-dom'
import { renderWithProviders } from '../test/renderWithProviders'
import { TemplatePage } from './TemplatePage'
import { TemplatesIndexPage } from './TemplatesIndexPage'

function Where() {
  const location = useLocation()
  return <p data-testid="where">{location.pathname + location.search}</p>
}

function renderAt(route: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/modelos" element={<TemplatesIndexPage lang="pt-BR" />} />
      <Route path="/modelos/:slug" element={<TemplatePage lang="pt-BR" />} />
      <Route path="/en/templates" element={<TemplatesIndexPage lang="en" />} />
      <Route path="/en/templates/:slug" element={<TemplatePage lang="en" />} />
      <Route path="*" element={<Where />} />
    </Routes>,
    { route },
  )
}

it('shows the template with its image, text, outline and a button to use it', async () => {
  renderAt('/modelos/revolucao-francesa')
  expect(screen.getByRole('heading', { level: 1, name: 'Mapa mental da Revolução Francesa' })).toBeInTheDocument()
  const image = screen.getByRole('img', { name: /Mapa mental da Revolução Francesa com os ramos/ })
  expect(image).toHaveAttribute('src', '/templates/revolucao-francesa.pt-BR.webp')
  for (const heading of ['Causas', 'Fases', 'Personagens', 'Consequências', 'O conteúdo do mapa']) {
    expect(screen.getByRole('heading', { level: 2, name: heading })).toBeInTheDocument()
  }
  expect(screen.getByText('Execução de Luís XVI')).toBeInTheDocument()
  await userEvent.click(screen.getAllByRole('button', { name: 'Usar este modelo' })[0])
  expect(screen.getByTestId('where')).toHaveTextContent('/edit/new?template=revolucao-francesa')
})

it('shows a flowchart template as its steps', () => {
  renderAt('/en/templates/yes-no-flowchart')
  const steps = screen.getByRole('heading', { level: 2, name: 'The steps of the flowchart' }).parentElement!
  expect(within(steps).getByText('Is the condition met?')).toBeInTheDocument()
  expect(within(steps).getByText(/Yes: Carry on with the action · No: Fix it or handle the exception/)).toBeInTheDocument()
})

it('links to the same template in the other language and to related templates', () => {
  renderAt('/modelos/revolucao-francesa')
  expect(screen.getByRole('link', { name: 'English' })).toHaveAttribute('href', '/en/templates/french-revolution')
  expect(screen.getByRole('link', { name: 'Modelo de mapa mental para resumo' })).toHaveAttribute('href', '/modelos/mapa-mental-para-resumo')
})

it('shows the 404 page for an unknown slug or a slug of the other language', () => {
  renderAt('/modelos/french-revolution')
  expect(screen.getByRole('heading', { name: 'Página não encontrada' })).toBeInTheDocument()
})

it('lists the templates of the language by category', () => {
  renderAt('/en/templates')
  expect(screen.getByRole('heading', { level: 1, name: 'Mind map and flowchart templates' })).toBeInTheDocument()
  const study = screen.getByRole('region', { name: 'Study' })
  expect(within(study).getByRole('link', { name: /French Revolution mind map/ })).toHaveAttribute('href', '/en/templates/french-revolution')
  const work = screen.getByRole('region', { name: 'Work' })
  expect(within(work).getByRole('link', { name: /Yes\/no decision flowchart template/ })).toBeInTheDocument()
})

it('shows a Portuguese page in Portuguese without changing the language the visitor chose', async () => {
  localStorage.setItem('rabisco.lang', 'en')
  renderWithProviders(
    <Routes>
      <Route path="/modelos/:slug" element={<TemplatePage lang="pt-BR" />} />
    </Routes>,
    { route: '/modelos/revolucao-francesa', lang: 'en' },
  )
  expect(await screen.findAllByRole('button', { name: 'Usar este modelo' })).not.toHaveLength(0)
  expect(await screen.findAllByRole('link', { name: 'Modelos' })).toHaveLength(2)
  expect(localStorage.getItem('rabisco.lang')).toBe('en')
  localStorage.clear()
})
