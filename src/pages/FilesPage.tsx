import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdSlot } from '../ads/AdSlot'
import { CookieNotice } from '../ads/CookieNotice'
import { AppFooter } from '../components/AppFooter'
import type { DriveFileMeta } from '../drive/client'
import { useFilePicker } from '../drive/usePicker'
import { useDrive } from '../drive/useDrive'
import { format } from '../i18n/format'
import { LanguageSwitcher } from '../i18n/LanguageSwitcher'
import { useI18n } from '../i18n/useI18n'
import { AccountMenu } from './AccountMenu'
import { FileCard } from './FileCard'

const NO_FILES: DriveFileMeta[] = []

type ListState = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; files: DriveFileMeta[] }

/** The scene embedded in an exported PNG/SVG ("Include editable data"), or null if there is none. */
async function sceneFromImage(file: File): Promise<string | null> {
  // Loaded on demand: Excalidraw is heavy and /app does not need it otherwise.
  const { loadFromBlob, serializeAsJSON } = await import('@excalidraw/excalidraw')
  try {
    const scene = await loadFromBlob(file, null, null)
    return serializeAsJSON(scene.elements, {}, scene.files, 'local')
  } catch {
    return null
  }
}

/** Lowercase and without accents, so "acao" finds "Ação". */
function fold(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export function FilesPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const drive = useDrive()
  const pick = useFilePicker()
  const [list, setList] = useState<ListState>({ kind: 'loading' })
  const [importError, setImportError] = useState<'image' | 'read' | null>(null)
  const [query, setQuery] = useState('')

  const fetchFiles = useCallback(async (): Promise<ListState> => {
    try {
      return { kind: 'ready', files: await drive.listFiles() }
    } catch {
      return { kind: 'error' }
    }
  }, [drive])

  useEffect(() => {
    let cancelled = false
    void fetchFiles().then((next) => {
      if (!cancelled) setList(next)
    })
    return () => {
      cancelled = true
    }
  }, [fetchFiles])

  async function retry() {
    setList({ kind: 'loading' })
    setList(await fetchFiles())
  }

  // The editor side (lazy, with Excalidraw) builds the map: see NewFileRedirect.
  async function importFile(input: HTMLInputElement) {
    const picked = input.files?.[0]
    input.value = ''
    if (!picked) return
    setImportError(null)
    try {
      if (/\.(png|svg)$/i.test(picked.name)) {
        const json = await sceneFromImage(picked)
        if (!json) return setImportError('image')
        const name = picked.name.replace(/(\.excalidraw)?\.(png|svg)$/i, '')
        return navigate('/edit/new', { state: { importScene: { name, json } } })
      }
      const name = picked.name.replace(/\.(md|markdown|txt)$/i, '')
      navigate('/edit/new', { state: { importMarkdown: { name, text: await picked.text() } } })
    } catch {
      setImportError('read')
    }
  }

  async function openFromDrive() {
    const picked = await pick().catch(() => null)
    if (picked) navigate(`/edit/${encodeURIComponent(picked.id)}`)
  }

  const files = list.kind === 'ready' ? list.files : NO_FILES
  const visible = useMemo(() => {
    const wanted = fold(query.trim())
    return wanted ? files.filter((file) => fold(file.name).includes(wanted)) : files
  }, [files, query])
  const isEmpty = list.kind === 'ready' && files.length === 0

  const importInput = (
    <label className="button-secondary">
      {t.files.importFile}
      <input
        type="file"
        accept=".md,.markdown,.txt,text/markdown,text/plain,.png,.svg,image/png,image/svg+xml"
        className="visually-hidden"
        onChange={(event) => void importFile(event.currentTarget)}
      />
    </label>
  )

  return (
    <main className="files-page">
      <header className="files-topbar">
        <span className="files-brand">
          <img src="/favicon.svg" alt="" width="30" height="30" />
          {t.app.name}
        </span>
        <div className="files-topbar-end">
          <LanguageSwitcher />
          <AccountMenu />
        </div>
      </header>

      {isEmpty ? (
        <section className="files-empty" aria-labelledby="files-empty-title">
          <EmptyArt />
          <h1 id="files-empty-title">{t.files.emptyTitle}</h1>
          <p>{t.files.emptyText}</p>
          <div className="files-actions">
            <button className="button button-large" type="button" onClick={() => navigate('/edit/new')}>
              {t.files.createFirst}
            </button>
            {importInput}
          </div>
          <p className="files-hint">
            {t.files.alreadyHave}{' '}
            <button type="button" className="button-link" onClick={() => void openFromDrive()}>
              {t.files.openFromDrive}
            </button>
          </p>
          {importError === 'read' && <p role="alert">{t.files.importReadFailed}</p>}
          {importError === 'image' && <p role="alert">{t.files.importImageFailed}</p>}
          <AdSlot placement="files" />
        </section>
      ) : (
        <>
          <div className="files-head">
            <div>
              <h1>{t.files.title}</h1>
              {list.kind === 'ready' && (
                <p className="files-count">{files.length === 1 ? t.files.countOne : format(t.files.count, { count: String(files.length) })}</p>
              )}
            </div>
            <div className="files-actions">
              {list.kind === 'ready' && (
                <input
                  type="search"
                  className="files-search"
                  aria-label={t.files.search}
                  placeholder={t.files.search}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              )}
              <button className="button-secondary" type="button" onClick={() => void openFromDrive()}>
                {t.files.openFromDrive}
              </button>
              {importInput}
              <button className="button" type="button" onClick={() => navigate('/edit/new')}>
                <span aria-hidden="true">+ </span>
                {t.files.new}
              </button>
            </div>
          </div>
          {importError === 'read' && <p role="alert">{t.files.importReadFailed}</p>}
          {importError === 'image' && <p role="alert">{t.files.importImageFailed}</p>}
          {list.kind === 'loading' && <p>{t.files.loading}</p>}
          {list.kind === 'error' && (
            <p role="alert">
              {t.files.loadFailed}{' '}
              <button type="button" className="button-link" onClick={() => void retry()}>
                {t.files.retry}
              </button>
            </p>
          )}
          {list.kind === 'ready' && visible.length === 0 && <p>{t.files.noResults}</p>}
          {visible.length > 0 && (
            <ul className="files-grid" aria-label={t.files.listLabel}>
              {visible.map((file) => (
                <FileCard key={file.id} file={file} />
              ))}
            </ul>
          )}
          <AdSlot placement="files" />
        </>
      )}
      <AppFooter />
      <CookieNotice />
    </main>
  )
}

/** A mind map just starting: one node and three dashed branches. */
function EmptyArt() {
  return (
    <svg className="files-empty-art" width="220" height="150" viewBox="0 0 220 150" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="3" strokeDasharray="2 8">
        <path d="M110 78C84 62 64 48 52 34" />
        <path d="M110 78C140 66 160 58 176 42" />
        <path d="M110 78C134 98 154 112 172 124" />
      </g>
      <rect x="82" y="60" width="56" height="36" rx="10" fill="Canvas" stroke="currentColor" strokeWidth="3" />
      <g stroke="currentColor" strokeOpacity="0.5" strokeWidth="2.5" strokeDasharray="4 5" fill="Canvas">
        <rect x="22" y="14" width="44" height="26" rx="8" />
        <rect x="170" y="22" width="44" height="26" rx="8" />
        <rect x="166" y="112" width="44" height="26" rx="8" />
      </g>
    </svg>
  )
}
