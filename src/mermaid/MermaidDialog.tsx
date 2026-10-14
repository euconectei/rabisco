import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react'
import { format } from '../i18n/format'
import type { Messages } from '../i18n/pt-BR'
import { useI18n } from '../i18n/useI18n'
import { convertMermaid, MERMAID_MAX_CHARS, MermaidError, type MermaidErrorCode, type MermaidResult } from './convert'
import './mermaid.css'

type ErrorKey = MermaidErrorCode | 'readFailed'

const FOCUSABLE = 'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
// A file far beyond the text limit is refused without reading it into memory.
const MAX_FILE_BYTES = MERMAID_MAX_CHARS * 8
const FILE_EXTENSION = /\.(mmd|md|txt)$/i

function errorText(errors: Messages['mermaid']['errors'], key: ErrorKey): string {
  switch (key) {
    case 'empty':
      return errors.empty
    case 'syntax':
      return errors.syntax
    case 'unsupported':
      return errors.unsupported
    case 'tooLarge':
      return errors.tooLarge
    case 'tooManyElements':
      return errors.tooManyElements
    case 'readFailed':
      return errors.readFailed
    case 'failed':
      return errors.failed
  }
}

export interface MermaidDialogProps {
  title: string
  submitLabel: string
  onClose(): void
  onSubmit(result: MermaidResult): void | Promise<void>
}

export function MermaidDialog({ title, submitLabel, onClose, onSubmit }: MermaidDialogProps) {
  const { t } = useI18n()
  const titleId = useId()
  const textId = useId()
  const fileId = useId()
  const errorId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)
  const [text, setText] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<ErrorKey | null>(null)
  const [busy, setBusy] = useState(false)
  // Set synchronously so two quick submits cannot both start a conversion.
  const running = useRef(false)
  const open = useRef(true)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  // Listens on the document (capture) so Esc and Tab work even when focus has dropped to the page,
  // e.g. after the submit button got disabled, and so the editor underneath never sees them.
  useEffect(() => {
    open.current = true
    const opener = document.activeElement
    textRef.current?.focus()
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') {
        // Esc that confirms or cancels an input method composition is not a request to close.
        if (event.isComposing) return
        event.preventDefault()
        event.stopPropagation()
        open.current = false
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const dialog = dialogRef.current
      const items = Array.from(dialog?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
      if (!dialog || items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      const inside = dialog.contains(active)
      if (event.shiftKey && (!inside || active === first)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (!inside || active === last)) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      open.current = false
      document.removeEventListener('keydown', onKeyDown, true)
      // Back to the control that opened the dialog, whichever way it closed.
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus()
    }
  }, [])

  function close() {
    open.current = false
    onClose()
  }

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const picked = input.files?.[0]
    input.value = ''
    if (!picked) return
    if (picked.size > MAX_FILE_BYTES) return setError('tooLarge')
    try {
      const content = await picked.text()
      setText(content)
      setFileName(picked.name.replace(FILE_EXTENSION, ''))
      setError(null)
      textRef.current?.focus()
    } catch {
      setError('readFailed')
    }
  }

  async function submit() {
    if (running.current) return
    running.current = true
    setBusy(true)
    setError(null)
    try {
      const converted = await convertMermaid(text)
      if (!open.current) return
      await onSubmit({ ...converted, name: fileName || t.files.untitled })
    } catch (failure) {
      if (open.current) setError(failure instanceof MermaidError ? failure.code : 'failed')
    } finally {
      running.current = false
      if (open.current) setBusy(false)
    }
  }

  const message = error ? format(errorText(t.mermaid.errors, error), { max: String(MERMAID_MAX_CHARS) }) : null

  return (
    <div className="dialog-backdrop">
      <div ref={dialogRef} className="dialog mermaid-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <h2 id={titleId}>{title}</h2>
        <label htmlFor={textId}>{t.mermaid.textLabel}</label>
        <textarea
          id={textId}
          ref={textRef}
          value={text}
          placeholder={t.mermaid.placeholder}
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => setText(event.currentTarget.value)}
        />
        <label htmlFor={fileId}>{t.mermaid.fileLabel}</label>
        <input id={fileId} type="file" accept=".mmd,.md,.txt,text/plain,text/markdown" onChange={(event) => void chooseFile(event)} />
        {message && (
          <p id={errorId} className="mermaid-error" role="alert">
            {message}
          </p>
        )}
        <div className="dialog-actions">
          <button type="button" className="button" disabled={busy} onClick={() => void submit()}>
            {busy ? t.mermaid.working : submitLabel}
          </button>
          <button type="button" className="button-secondary" onClick={close}>
            {t.mermaid.cancel}
          </button>
        </div>
      </div>
    </div>
  )
}
