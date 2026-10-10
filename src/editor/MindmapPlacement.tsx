import { useEffect } from 'react'
import { useI18n } from '../i18n/useI18n'

interface Props {
  onPlace(client: { clientX: number; clientY: number }): void
  onCancel(): void
}

/** Transparent layer over the canvas while choosing where a new mind map starts. */
export function MindmapPlacement({ onPlace, onCancel }: Props) {
  const { t } = useI18n()
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onCancel])
  return (
    <div
      className="mindmap-placement"
      data-testid="mindmap-placement"
      onPointerDown={(event) => {
        event.preventDefault()
        onPlace({ clientX: event.clientX, clientY: event.clientY })
      }}
    >
      <p className="mindmap-placement-hint">{t.mindmap.placeHint}</p>
    </div>
  )
}
