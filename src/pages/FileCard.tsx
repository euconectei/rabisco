import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { DriveFileMeta } from '../drive/client'
import { format } from '../i18n/format'
import { formatRelativeTime } from '../i18n/relativeTime'
import { useI18n } from '../i18n/useI18n'

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

export function FileCard({ file }: { file: DriveFileMeta }) {
  const { lang, t } = useI18n()
  const [broken, setBroken] = useState(false)
  const name = file.name.replace(/\.excalidraw$/i, '')
  return (
    <li>
      <Link className="file-card" to={`/edit/${encodeURIComponent(file.id)}`}>
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
    </li>
  )
}
