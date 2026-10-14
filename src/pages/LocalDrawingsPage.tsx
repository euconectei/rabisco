import { Link, Navigate } from 'react-router-dom'
import { BrandLink } from '../components/BrandLink'
import { AppFooter } from '../components/AppFooter'
import { LanguageSwitcher } from '../i18n/LanguageSwitcher'
import { useI18n } from '../i18n/useI18n'
import { MoveResult } from '../local/MoveResult'
import { useLocalDrawings } from '../local/useLocalDrawings'
import { useMoveLocal } from '../local/useMoveLocal'
import { useMode } from '../mode/useMode'
import { AccountMenu } from './AccountMenu'
import { FileCard } from './FileCard'
import '../local/local.css'

/** In the Google mode: the drawings still kept in this browser, to open them or move them all to Drive. */
export function LocalDrawingsPage() {
  const { t } = useI18n()
  const { mode } = useMode()
  const { drawings, reload } = useLocalDrawings()
  const { state, start, reset } = useMoveLocal()
  // Without an account the local drawings are the files page itself.
  if (mode === 'local') return <Navigate to="/app" replace />

  const files = drawings.kind === 'ready' ? drawings.files : []
  const moving = state.phase === 'running'

  async function moveAll() {
    await start(undefined, files.length)
    await reload()
  }

  async function retry(ids: string[]) {
    await start(ids)
    await reload()
  }

  return (
    <main className="files-page">
      <header className="files-topbar">
        <BrandLink className="files-brand" size={30} />
        <div className="files-topbar-end">
          <LanguageSwitcher />
          <AccountMenu />
        </div>
      </header>
      <div className="files-head">
        <div>
          <h1>{t.files.localDrawings}</h1>
          <p className="files-count">{t.move.pageIntro}</p>
        </div>
        <div className="files-actions">
          <Link className="button-secondary" to="/app">
            {t.editor.backToFiles}
          </Link>
          {files.length > 0 && state.phase === 'idle' && (
            <button type="button" className="button" onClick={() => void moveAll()}>
              {t.move.moveAll}
            </button>
          )}
        </div>
      </div>
      {state.phase !== 'idle' && (
        <section className="move-offer" aria-live="polite">
          <MoveResult state={state} onRetry={(ids) => void retry(ids)} onClose={reset} />
        </section>
      )}
      {drawings.kind === 'loading' && <p>{t.files.loading}</p>}
      {drawings.kind === 'error' && <p role="alert">{t.files.localLoadFailed}</p>}
      {drawings.kind === 'ready' && files.length === 0 && !moving && <p>{t.move.empty}</p>}
      {files.length > 0 && (
        <ul className="files-grid" aria-label={t.files.listLabel}>
          {files.map((file) => (
            <FileCard key={file.id} file={file} />
          ))}
        </ul>
      )}
      <AppFooter />
    </main>
  )
}
