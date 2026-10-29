import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { DriveFileMeta } from '../drive/client'
import { Dialog } from '../editor/Dialog'
import { deleteDraft } from '../editor/drafts'
import { format } from '../i18n/format'
import { formatRelativeTime } from '../i18n/relativeTime'
import { useI18n } from '../i18n/useI18n'
import { isLocalId } from '../local/ids'

// One tint per file, always the same for the same id, so the grid has some rhythm without a thumbnail.
const TINTS = ['#6965db', '#1971c2', '#e8590c', '#2b8a3e', '#9c36b5']

function tintOf(id: string): string {
  let sum = 0
  for (const char of id) sum = (sum + char.charCodeAt(0)) % TINTS.length
  return TINTS.at(sum) ?? TINTS[0]
}

/**
 * The Drive hands out a small thumbnail (`=s220`); ask for a sharper one. A `data:` URL (a drawing kept
 * in this browser) is already the final image and is left alone.
 */
function thumbnailSrc(link: string): string {
  if (link.startsWith('data:')) return link
  return link.replace(/=s\d+$/, '=s480')
}

/** A hand-drawn mind map, shown while there is no thumbnail (or it failed to load). */
function PlaceholderArt() {
  return (
    <svg viewBox="0 0 160 100" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="2.5">
        <path d="M80 52C62 42 48 32 38 22" />
        <path d="M80 52C98 46 112 40 124 30" />
        <path d="M80 52C96 64 110 72 122 80" />
        <rect x="60" y="40" width="40" height="24" rx="7" fill="Canvas" />
      </g>
      <g stroke="currentColor" strokeOpacity="0.55" strokeWidth="2" fill="Canvas">
        <rect x="14" y="8" width="34" height="18" rx="6" />
        <rect x="112" y="14" width="34" height="18" rx="6" />
        <rect x="110" y="72" width="34" height="18" rx="6" />
      </g>
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
    </svg>
  )
}

/** `onDelete` makes the card deletable, after a confirmation; it resolves when the file is gone and rejects if it could not be. */
export function FileCard({ file, onDelete }: { file: DriveFileMeta; onDelete?: (file: DriveFileMeta) => Promise<void> }) {
  const { lang, t } = useI18n()
  const [broken, setBroken] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [failed, setFailed] = useState(false)
  const name = file.name.replace(/\.excalidraw$/i, '')

  function close() {
    setConfirming(false)
    setFailed(false)
  }

  async function confirmDelete() {
    if (!onDelete) return
    setDeleting(true)
    setFailed(false)
    try {
      await onDelete(file)
      await deleteDraft(file.id)
      setConfirming(false)
    } catch {
      setFailed(true)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <li className="file-item">
      <Link className="file-card" to={`/edit/${encodeURIComponent(file.id)}`} state={{ name }}>
        <span className="file-preview" style={{ '--tint': tintOf(file.id) } as React.CSSProperties}>
          {file.thumbnailLink && !broken ? (
            <img src={thumbnailSrc(file.thumbnailLink)} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
          ) : (
            <PlaceholderArt />
          )}
        </span>
        <span className="file-meta">
          <span className="file-name">{name}</span>
          <span className="file-date">{format(t.files.edited, { time: formatRelativeTime(file.modifiedTime, lang) })}</span>
        </span>
      </Link>
      {onDelete ? (
        <button type="button" className="file-delete" aria-label={format(t.files.delete, { name })} title={format(t.files.delete, { name })} onClick={() => setConfirming(true)}>
          <TrashIcon />
        </button>
      ) : null}
      {confirming ? (
        <Dialog title={t.files.deleteTitle} onClose={deleting ? undefined : close} closeLabel={t.files.deleteClose}>
          <p>{format(isLocalId(file.id) ? t.files.deleteInBrowser : t.files.deleteInDrive, { name })}</p>
          {failed ? <p role="alert">{t.files.deleteFailed}</p> : null}
          <div className="dialog-actions">
            <button type="button" className="button-secondary" disabled={deleting} onClick={close}>
              {t.files.deleteCancel}
            </button>
            <button type="button" className="button button-danger" disabled={deleting} onClick={() => void confirmDelete()}>
              {deleting ? t.files.deleting : t.files.deleteConfirm}
            </button>
          </div>
        </Dialog>
      ) : null}
    </li>
  )
}
