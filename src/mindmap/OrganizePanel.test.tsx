import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nProvider } from '../i18n/I18nProvider'
import { OrganizePanel, type OrganizePanelProps } from './OrganizePanel'

function renderPanel(props: Partial<OrganizePanelProps> = {}, lang: 'pt-BR' | 'en' = 'pt-BR') {
  const handlers = {
    onLayout: vi.fn(),
    onStyle: vi.fn(),
    onClose: vi.fn(),
  }
  const defaults: OrganizePanelProps = {
    mapId: 'm1',
    layout: 'both',
    style: 'boxes',
    ...handlers,
  }
  render(
    <I18nProvider initialLanguage={lang}>
      <OrganizePanel {...defaults} {...props} />
    </I18nProvider>,
  )
  return handlers
}

describe('OrganizePanel', () => {
  it('opens with the current options checked and the focus on the checked option', () => {
    renderPanel()
    const dialog = screen.getByRole('dialog', { name: 'Organizar' })
    expect(dialog).toHaveAttribute('data-map-id', 'm1')
    expect(screen.getByRole('radio', { name: 'Dois lados' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Caixas' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Para a direita' })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: 'Livre' })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: 'Linhas' })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: 'Dois lados' })).toHaveFocus()
  })

  it('reports the chosen layout and style', async () => {
    const handlers = renderPanel()
    await userEvent.click(screen.getByRole('radio', { name: 'Para a direita' }))
    expect(handlers.onLayout).toHaveBeenCalledWith('right')
    await userEvent.click(screen.getByRole('radio', { name: 'Livre' }))
    expect(handlers.onLayout).toHaveBeenCalledWith('free')
    await userEvent.click(screen.getByRole('radio', { name: 'Linhas' }))
    expect(handlers.onStyle).toHaveBeenCalledWith('lines')
  })

  it('Tab cycles through the checked options and the close button without leaving the panel', async () => {
    renderPanel()
    // A radio group is one tab stop, so Tab jumps between the two groups and the close button.
    await userEvent.tab()
    expect(screen.getByRole('radio', { name: 'Caixas' })).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Fechar' })).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole('radio', { name: 'Dois lados' })).toHaveFocus()
    await userEvent.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'Fechar' })).toHaveFocus()
  })

  it('Enter picks the focused option', async () => {
    const handlers = renderPanel()
    screen.getByRole('radio', { name: 'Para a direita' }).focus()
    await userEvent.keyboard('{Enter}')
    expect(handlers.onLayout).toHaveBeenCalledWith('right')
  })

  it('Esc closes', async () => {
    const handlers = renderPanel()
    await userEvent.keyboard('{Escape}')
    expect(handlers.onClose).toHaveBeenCalledTimes(1)
  })

  it('the close button closes', async () => {
    const handlers = renderPanel()
    await userEvent.click(screen.getByRole('button', { name: 'Fechar' }))
    expect(handlers.onClose).toHaveBeenCalledTimes(1)
  })

  it('labels the options in English', () => {
    renderPanel({}, 'en')
    expect(screen.getByRole('dialog', { name: 'Organize' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Both sides' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'To the right' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Free' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Boxes' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Lines' })).toBeInTheDocument()
  })
})
