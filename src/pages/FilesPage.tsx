import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppFooter } from '../components/AppFooter'
import type { DriveFileMeta } from '../drive/client'
import { useFilePicker } from '../drive/usePicker'
import { useDrive } from '../drive/useDrive'
import { format } from '../i18n/format'
import { LanguageSwitcher } from '../i18n/LanguageSwitcher'
import { formatRelativeTime } from '../i18n/relativeTime'
import { useI18n } from '../i18n/useI18n'
import { AccountMenu } from './AccountMenu'

type ListState = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; files: DriveFileMeta[] }

export function FilesPage() {
  const { lang, t } = useI18n()
  const navigate = useNavigate()
  const drive = useDrive()
  const pick = useFilePicker()
  const [list, setList] = useState<ListState>({ kind: 'loading' })

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
  async function importMarkdown(input: HTMLInputElement) {
    const picked = input.files?.[0]
    input.value = ''
    if (!picked) return
    const name = picked.name.replace(/\.(md|markdown|txt)$/i, '')
    navigate('/edit/new', { state: { importMarkdown: { name, text: await picked.text() } } })
  }

  async function openFromDrive() {
    const picked = await pick().catch(() => null)
    if (picked) navigate(`/edit/${encodeURIComponent(picked.id)}`)
  }

  return (
    <main className="page">
      <header className="page-header">
        <h1>{t.files.title}</h1>
        <AccountMenu />
      </header>
      <div className="files-actions">
        <button className="button" type="button" onClick={() => navigate('/edit/new')}>
          {t.files.new}
        </button>
        <button className="button-secondary" type="button" onClick={() => void openFromDrive()}>
          {t.files.openFromDrive}
        </button>
        <label className="button-secondary">
          {t.files.importMarkdown}
          <input
            type="file"
            accept=".md,.markdown,.txt,text/markdown,text/plain"
            className="visually-hidden"
            onChange={(event) => void importMarkdown(event.currentTarget)}
          />
        </label>
      </div>
      {list.kind === 'loading' && <p>{t.files.loading}</p>}
      {list.kind === 'error' && (
        <p role="alert">
          {t.files.loadFailed}{' '}
          <button type="button" className="button-link" onClick={() => void retry()}>
            {t.files.retry}
          </button>
        </p>
      )}
      {list.kind === 'ready' && list.files.length === 0 && <p>{t.files.empty}</p>}
      {list.kind === 'ready' && list.files.length > 0 && (
        <ul className="files-list" aria-label={t.files.listLabel}>
          {list.files.map((file) => (
            <li key={file.id}>
              <Link to={`/edit/${encodeURIComponent(file.id)}`}>
                <span className="file-name">{file.name.replace(/\.excalidraw$/i, '')}</span>
                <span className="file-date">{format(t.files.edited, { time: formatRelativeTime(file.modifiedTime, lang) })}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <LanguageSwitcher />
      <AppFooter />
    </main>
  )
}
