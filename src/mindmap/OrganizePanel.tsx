import { useEffect, useRef, type KeyboardEvent } from 'react'
import { useI18n } from '../i18n/useI18n'
import type { MapLayout, MapStyle } from './model'

export interface OrganizePanelProps {
  mapId: string
  layout: MapLayout
  style: MapStyle
  onLayout: (layout: MapLayout) => void
  onStyle: (style: MapStyle) => void
  onClose: () => void
  /** The editor's theme (Excalidraw's own), so the panel matches the canvas it floats over. */
  theme?: string
}

/** The three organizations and two styles a map can have, as one radio group each. */
function OptionGroup<T extends string>({
  name,
  legend,
  options,
  value,
  onChange,
}: {
  name: string
  legend: string
  options: ReadonlyArray<{ value: T; label: string }>
  value: T
  onChange: (value: T) => void
}) {
  return (
    <fieldset>
      <legend>{legend}</legend>
      {options.map((option) => (
        <label key={option.value}>
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            onKeyDown={(event) => {
              // Enter picks the focused option, like Space, so the panel works with a keyboard alone.
              if (event.key === 'Enter') {
                event.preventDefault()
                onChange(option.value)
              }
            }}
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  )
}

/**
 * The "Organizar" panel: two radio groups (organization and style) for one map, openable by mouse,
 * touch and keyboard. Focus lands on the checked option on open, Tab stays inside the panel, and
 * Esc closes it.
 */
export function OrganizePanel({ mapId, layout, style, onLayout, onStyle, onClose, theme = 'light' }: OrganizePanelProps) {
  const { t } = useI18n()
  const panelRef = useRef<HTMLDivElement>(null)

  // Land on the checked option as soon as the panel opens, so a keyboard user starts in the right place.
  useEffect(() => {
    const checked = panelRef.current?.querySelector<HTMLInputElement>('input[type="radio"]:checked')
    checked?.focus()
  }, [])

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      onClose()
      return
    }
    if (event.key !== 'Tab') return
    // Keep Tab cycling through the checked options and the close button, never out into the canvas.
    // A radio group is a single tab stop (its checked option), so the tab stops are the two checked
    // radios plus the close button.
    const panel = panelRef.current
    if (!panel) return
    const focusable = [...panel.querySelectorAll<HTMLElement>('button, input[type="radio"]')].filter(
      (el) => !(el instanceof HTMLInputElement) || el.checked,
    )
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    const active = document.activeElement
    if (event.shiftKey) {
      if (active === first || !panel.contains(active)) {
        event.preventDefault()
        last.focus()
      }
    } else if (active === last || !panel.contains(active)) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <div ref={panelRef} className="organize-panel" data-theme={theme} role="dialog" aria-modal="true" aria-label={t.mindmap.organize.title} data-map-id={mapId} onKeyDown={onKeyDown}>
      <h2 className="organize-title">{t.mindmap.organize.title}</h2>
      <OptionGroup
        name="organize-layout"
        legend={t.mindmap.organize.layout}
        value={layout}
        onChange={onLayout}
        options={[
          { value: 'both', label: t.mindmap.organize.layoutBoth },
          { value: 'right', label: t.mindmap.organize.layoutRight },
          { value: 'free', label: t.mindmap.organize.layoutFree },
        ]}
      />
      <OptionGroup
        name="organize-style"
        legend={t.mindmap.organize.style}
        value={style}
        onChange={onStyle}
        options={[
          { value: 'boxes', label: t.mindmap.organize.styleBoxes },
          { value: 'lines', label: t.mindmap.organize.styleLines },
        ]}
      />
      <button type="button" className="organize-close" onClick={onClose} aria-label={t.mindmap.organize.close}>
        ×
      </button>
    </div>
  )
}
