import 'vitest-canvas-mock'
import { act, render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { collapse } from './collapse'
import { addChild, createMap } from './commands'
import { touchTarget, TouchToolbar, useSettled } from './TouchToolbar'

const labels = { toolbar: 'Ações do mapa', addChild: '+ filho', addSibling: '+ irmão', collapse: 'Recolher', expand: 'Expandir', delete: 'Apagar' }

function sample() {
  let r = createMap([], { x: 0, y: 0 }, 'Raiz')
  const root = r.select!
  r = addChild(r.elements, root, 'A')
  return { elements: r.elements, root, a: r.select! }
}
const state = (selected: string[], editing: unknown = null) => ({
  selectedElementIds: Object.fromEntries(selected.map((id) => [id, true])),
  editingTextElement: editing,
})

describe('touchTarget', () => {
  it('is the selected node, anchored at the middle of its top edge', () => {
    const s = sample()
    const root = s.elements.find((e) => e.id === s.root)!
    expect(touchTarget(s.elements, state([s.root]) as never)).toEqual({ nodeId: s.root, collapsed: false, hasChildren: true, x: root.x + root.width / 2, y: root.y })
  })

  it('knows when the node is collapsed', () => {
    const s = sample()
    expect(touchTarget(collapse(s.elements, s.root).elements, state([s.root]) as never)?.collapsed).toBe(true)
  })

  it('is null with two nodes selected, nothing selected or a text being edited', () => {
    const s = sample()
    expect(touchTarget(s.elements, state([s.root, s.a]) as never)).toBeNull()
    expect(touchTarget(s.elements, state([]) as never)).toBeNull()
    expect(touchTarget(s.elements, state([s.root], { id: 't' }) as never)).toBeNull()
  })
})

describe('TouchToolbar', () => {
  const handlers = () => ({ onAddChild: vi.fn(), onAddSibling: vi.fn(), onToggleCollapse: vi.fn(), onDelete: vi.fn() })

  it('shows big buttons that run the same commands as the keyboard', async () => {
    const h = handlers()
    render(<TouchToolbar position={{ left: 100, top: 50 }} collapsed={false} canCollapse labels={labels} {...h} />)
    expect(screen.getByRole('toolbar', { name: 'Ações do mapa' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '+ filho' }))
    await userEvent.click(screen.getByRole('button', { name: '+ irmão' }))
    await userEvent.click(screen.getByRole('button', { name: 'Recolher' }))
    await userEvent.click(screen.getByRole('button', { name: 'Apagar' }))
    expect(h.onAddChild).toHaveBeenCalledTimes(1)
    expect(h.onAddSibling).toHaveBeenCalledTimes(1)
    expect(h.onToggleCollapse).toHaveBeenCalledTimes(1)
    expect(h.onDelete).toHaveBeenCalledTimes(1)
  })

  it('labels the collapse button by state, and disables it on a leaf', () => {
    const h = handlers()
    const { rerender } = render(<TouchToolbar position={{ left: 0, top: 0 }} collapsed canCollapse labels={labels} {...h} />)
    expect(screen.getByRole('button', { name: 'Expandir' })).toBeEnabled()
    rerender(<TouchToolbar position={{ left: 0, top: 0 }} collapsed={false} canCollapse={false} labels={labels} {...h} />)
    expect(screen.getByRole('button', { name: 'Recolher' })).toBeDisabled()
  })

  it('stays inside the screen', () => {
    const h = handlers()
    render(<TouchToolbar position={{ left: -200, top: -30 }} collapsed={false} canCollapse labels={labels} {...h} />)
    const bar = screen.getByRole('toolbar')
    expect(parseFloat(bar.style.left)).toBeGreaterThanOrEqual(8)
    expect(parseFloat(bar.style.top)).toBeGreaterThanOrEqual(8)
  })
})

describe('useSettled', () => {
  it('is false while the key keeps changing (scroll, zoom) and true shortly after it stops', () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(({ key }) => useSettled(key, 200), { initialProps: { key: 'a' } })
    expect(result.current).toBe(true)
    rerender({ key: 'b' })
    expect(result.current).toBe(false)
    act(() => vi.advanceTimersByTime(150))
    rerender({ key: 'c' })
    act(() => vi.advanceTimersByTime(150))
    expect(result.current).toBe(false)
    act(() => vi.advanceTimersByTime(60))
    expect(result.current).toBe(true)
    vi.useRealTimers()
  })
})
