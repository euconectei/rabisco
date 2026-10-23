import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react'

interface DialogProps {
  title: string
  children: ReactNode
  /**
   * When given, the dialog is dismissible: a × button, Esc and a click on the backdrop all call it,
   * and focus returns to whatever was focused before. Without it the dialog stays until its own
   * actions resolve (e.g. the conflict and draft prompts).
   */
  onClose?: () => void
  /** Accessible name of the × button. */
  closeLabel?: string
  className?: string
}

// Elements that can take focus, in DOM order, used to move focus in and to keep Tab inside.
const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

export function Dialog({ title, children, onClose, closeLabel = 'Fechar', className }: DialogProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)

  // Land focus inside the dialog on open and give it back to the opener on close, so a keyboard
  // user never loses their place. The opener is remembered on mount and only restored if it is
  // still in the document (it may have been unmounted by navigation).
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const first = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE)
    ;(first ?? dialogRef.current)?.focus()
    return () => {
      if (opener?.isConnected) opener.focus()
    }
  }, [])

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && onClose) {
      event.preventDefault()
      onClose()
      return
    }
    if (event.key !== 'Tab') return
    // Keep Tab cycling through the dialog's controls instead of escaping to the page behind it.
    const dialog = dialogRef.current
    if (!dialog) return
    const focusable = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => !el.hasAttribute('disabled'))
    if (focusable.length === 0) {
      event.preventDefault()
      dialog.focus()
      return
    }
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    const active = document.activeElement
    if (event.shiftKey) {
      if (active === first || !dialog.contains(active)) {
        event.preventDefault()
        last.focus()
      }
    } else if (active === last || !dialog.contains(active)) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <div className="dialog-backdrop" onClick={() => onClose?.()}>
      <div
        ref={dialogRef}
        className={className ? `dialog ${className}` : 'dialog'}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId}>{title}</h2>
        {onClose && (
          <button type="button" className="dialog-close" onClick={onClose} aria-label={closeLabel}>
            ×
          </button>
        )}
        {children}
      </div>
    </div>
  )
}
