import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nProvider } from '../i18n/I18nProvider'
import { MERMAID_MAX_CHARS, type MermaidResult } from './convert'
import { MermaidDialog } from './MermaidDialog'
import { useState } from 'react'

const parse = vi.fn()
const convert = vi.fn()

vi.mock('@excalidraw/mermaid-to-excalidraw', () => ({ parseMermaidToExcalidraw: (...args: unknown[]) => parse(...args) }))
vi.mock('@excalidraw/excalidraw', () => ({ convertToExcalidrawElements: (...args: unknown[]) => convert(...args) }))

const FLOW = 'flowchart TD\n  A[Start] --> B{Payment ok?}'

function setup(overrides: { onSubmit?: (result: MermaidResult) => void | Promise<void>; onClose?: () => void } = {}) {
  const onSubmit = vi.fn(overrides.onSubmit ?? (() => {}))
  const onClose = vi.fn(overrides.onClose ?? (() => {}))
  render(
    <I18nProvider initialLanguage="pt-BR">
      <MermaidDialog title="Importar Mermaid" submitLabel="Criar desenho" onClose={onClose} onSubmit={onSubmit} />
    </I18nProvider>,
  )
  return { onSubmit, onClose }
}

const box = () => screen.getByRole('textbox', { name: 'Código Mermaid' })
const create = () => screen.getByRole('button', { name: /Criar desenho|Convertendo/ })

beforeEach(() => {
  parse.mockReset()
  convert.mockReset()
  parse.mockResolvedValue({ elements: [{ type: 'rectangle', id: 'a', x: 0, y: 0, width: 10, height: 10 }] })
  convert.mockImplementation((items: unknown[]) => items)
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('MermaidDialog', () => {
  it('is a modal dialog named by its title, with focus in the text box', () => {
    setup()
    const dialog = screen.getByRole('dialog', { name: 'Importar Mermaid' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(box()).toHaveFocus()
  })

  it('closes on Escape without converting or creating anything', async () => {
    const { onClose, onSubmit } = setup()
    await userEvent.type(box(), 'flowchart TD')
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onSubmit).not.toHaveBeenCalled()
    expect(parse).not.toHaveBeenCalled()
  })

  it('closes on Escape even when focus is on the page, and on Cancel', async () => {
    const { onClose } = setup()
    ;(document.activeElement as HTMLElement).blur()
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('keeps Tab inside the dialog, wrapping at both ends', async () => {
    setup()
    const cancel = screen.getByRole('button', { name: 'Cancelar' })
    await userEvent.tab()
    await userEvent.tab()
    expect(create()).toHaveFocus()
    await userEvent.tab()
    expect(cancel).toHaveFocus()
    await userEvent.tab()
    expect(box()).toHaveFocus()
    await userEvent.tab({ shift: true })
    expect(cancel).toHaveFocus()
    expect(screen.getByRole('dialog')).toContainElement(document.activeElement as HTMLElement)
  })

  it('submits the converted result with the default name for pasted text', async () => {
    const { onSubmit } = setup()
    await userEvent.click(box())
    await userEvent.paste(FLOW)
    await userEvent.click(create())
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    const result = onSubmit.mock.calls[0][0]
    expect(result.name).toBe('Sem título')
    expect(result.elements).toHaveLength(1)
    expect(result.files).toEqual({})
  })

  it('fills the box with the exact content of the chosen file and names the drawing after it', async () => {
    const { onSubmit } = setup()
    const content = '  flowchart LR\n\tA --> B  \n\n'
    await userEvent.upload(screen.getByLabelText(/Ou escolha um arquivo/), new File([content], 'fluxo.mmd', { type: 'text/plain' }))
    await waitFor(() => expect(box()).toHaveValue(content))
    await userEvent.click(create())
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0].name).toBe('fluxo')
  })

  it.each(['pedido.md', 'notas.TXT'])('drops the %s extension from the name', async (fileName) => {
    const { onSubmit } = setup()
    await userEvent.upload(screen.getByLabelText(/Ou escolha um arquivo/), new File([FLOW], fileName))
    await waitFor(() => expect(box()).toHaveValue(FLOW))
    await userEvent.click(create())
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0].name).toBe(fileName.replace(/\.(md|txt)$/i, ''))
  })

  it('shows a friendly message when the file cannot be read', async () => {
    setup()
    const file = new File(['x'], 'a.mmd')
    Object.defineProperty(file, 'text', { value: () => Promise.reject(new Error('io')) })
    fireEvent.change(screen.getByLabelText(/Ou escolha um arquivo/), { target: { files: [file] } })
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível ler o arquivo.')
  })

  it('shows the syntax error in the dialog, keeps the text and creates nothing', async () => {
    parse.mockRejectedValue(new Error('Parse error on line 2\n  at Object.parse (mermaid.js:1:1)'))
    const { onSubmit, onClose } = setup()
    await userEvent.click(box())
    await userEvent.paste('flowchart TD\nA--')
    await userEvent.click(create())
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('O Mermaid não entendeu este texto')
    expect(alert).not.toHaveTextContent(/Parse error|mermaid\.js|at Object/)
    expect(box()).toHaveValue('flowchart TD\nA--')
    expect(onSubmit).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
    expect(create()).toBeEnabled()
  })

  it('asks for text when the box is empty', async () => {
    const { onSubmit } = setup()
    await userEvent.click(create())
    expect(await screen.findByRole('alert')).toHaveTextContent('Cole um diagrama Mermaid')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('reports text over the limit with the limit in the message', async () => {
    const { onSubmit } = setup()
    fireEvent.change(box(), { target: { value: 'x'.repeat(MERMAID_MAX_CHARS + 1) } })
    await userEvent.click(create())
    expect(await screen.findByRole('alert')).toHaveTextContent(`${MERMAID_MAX_CHARS} caracteres`)
    expect(onSubmit).not.toHaveBeenCalled()
    expect(parse).not.toHaveBeenCalled()
  })

  it('refuses a file far beyond the limit without reading it', async () => {
    setup()
    const file = new File(['x'], 'huge.mmd')
    const text = vi.fn(() => Promise.resolve('x'))
    Object.defineProperty(file, 'text', { value: text })
    Object.defineProperty(file, 'size', { value: MERMAID_MAX_CHARS * 100 })
    fireEvent.change(screen.getByLabelText(/Ou escolha um arquivo/), { target: { files: [file] } })
    expect(await screen.findByRole('alert')).toHaveTextContent(`${MERMAID_MAX_CHARS} caracteres`)
    expect(text).not.toHaveBeenCalled()
  })

  it.each([
    ['XSS payload', 'flowchart TD\nA["<img src=x onerror=alert(1)>"]'],
    ['remote image', 'flowchart TD\nA["<img src=https://evil.example/p.png>"]'],
  ])('rejects a %s in the dialog without reaching the library', async (_name, payload) => {
    const { onSubmit } = setup()
    fireEvent.change(box(), { target: { value: payload } })
    await userEvent.click(create())
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(parse).not.toHaveBeenCalled()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('shows the unsupported message when the library answers with a picture', async () => {
    parse.mockResolvedValue({ elements: [{ type: 'image', fileId: 'f' }], files: {} })
    const { onSubmit } = setup()
    fireEvent.change(box(), { target: { value: 'pie title Pets\n"Dogs": 2' } })
    await userEvent.click(create())
    expect(await screen.findByRole('alert')).toHaveTextContent('Este diagrama usa recursos que ainda não podem ser convertidos')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('disables the button while converting and runs a double click only once', async () => {
    let finish: (value: unknown) => void = () => {}
    parse.mockReturnValue(new Promise((resolve) => (finish = resolve)))
    const { onSubmit } = setup()
    fireEvent.change(box(), { target: { value: FLOW } })
    const button = create()
    fireEvent.click(button)
    fireEvent.click(button)
    expect(await screen.findByRole('button', { name: 'Convertendo…' })).toBeDisabled()
    await act(async () => {
      finish({ elements: [{ type: 'rectangle', id: 'a' }] })
    })
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(parse).toHaveBeenCalledTimes(1)
  })

  it('does not submit when closed while the conversion is still running', async () => {
    let finish: (value: unknown) => void = () => {}
    parse.mockReturnValue(new Promise((resolve) => (finish = resolve)))
    const { onSubmit, onClose } = setup()
    fireEvent.change(box(), { target: { value: FLOW } })
    fireEvent.click(create())
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
    await act(async () => {
      finish({ elements: [{ type: 'rectangle', id: 'a' }] })
    })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('shows an error and re-enables the button when the submit handler fails', async () => {
    setup({ onSubmit: () => Promise.reject(new Error('navigation failed')) })
    fireEvent.change(box(), { target: { value: FLOW } })
    await userEvent.click(create())
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível converter o diagrama')
    expect(create()).toBeEnabled()
  })

  it('leaves no temporary Mermaid nodes in the page after a failed conversion', async () => {
    parse.mockImplementation(async () => {
      const node = document.createElement('div')
      node.id = 'dmermaid-to-excalidraw-0'
      document.body.appendChild(node)
      throw new Error('boom')
    })
    setup()
    fireEvent.change(box(), { target: { value: FLOW } })
    await userEvent.click(create())
    await screen.findByRole('alert')
    expect(document.getElementById('dmermaid-to-excalidraw-0')).toBeNull()
  })

  it('uses the English texts', () => {
    render(
      <I18nProvider initialLanguage="en">
        <MermaidDialog title="Import Mermaid" submitLabel="Create drawing" onClose={() => {}} onSubmit={() => {}} />
      </I18nProvider>,
    )
    expect(screen.getByRole('textbox', { name: 'Mermaid code' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('does not cut a long paste: it reports the size and converts nothing', async () => {
    const { onSubmit } = setup()
    await userEvent.click(box())
    await userEvent.paste('x'.repeat(MERMAID_MAX_CHARS + 1000))
    expect((box() as HTMLTextAreaElement).value).toHaveLength(MERMAID_MAX_CHARS + 1000)
    await userEvent.click(create())
    expect(await screen.findByRole('alert')).toHaveTextContent(`${MERMAID_MAX_CHARS} caracteres`)
    expect(parse).not.toHaveBeenCalled()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('ignores the Escape that ends an input method composition', () => {
    const { onClose } = setup()
    fireEvent.keyDown(box(), { key: 'Escape', isComposing: true })
    expect(onClose).not.toHaveBeenCalled()
  })

  it.each([
    ['Escape', async () => userEvent.keyboard('{Escape}')],
    ['Cancel', async () => userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))],
  ])('puts the focus back on the button that opened it (%s)', async (_name, close) => {
    function Host() {
      const [shown, setShown] = useState(false)
      return (
        <I18nProvider initialLanguage="pt-BR">
          <button type="button" onClick={() => setShown(true)}>
            abrir
          </button>
          {shown && <MermaidDialog title="Importar Mermaid" submitLabel="Criar desenho" onClose={() => setShown(false)} onSubmit={() => {}} />}
        </I18nProvider>
      )
    }
    render(<Host />)
    await userEvent.click(screen.getByRole('button', { name: 'abrir' }))
    expect(box()).toHaveFocus()
    await close()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'abrir' })).toHaveFocus()
  })
})
