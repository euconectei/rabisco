import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDrive } from '../drive/useDrive'
import { useI18n } from '../i18n/useI18n'
import { emptySceneJson } from './scene'

// /edit/new: creates the file in Drive first, then replaces the URL with /edit/<id>.
export default function NewFileRedirect() {
  const drive = useDrive()
  const { t } = useI18n()
  const navigate = useNavigate()
  const [failed, setFailed] = useState(false)
  const started = useRef(false)
  const untitled = t.files.untitled

  useEffect(() => {
    // StrictMode runs effects twice; the ref keeps us from creating two files.
    if (started.current) return
    started.current = true
    void (async () => {
      try {
        const folderId = await drive.ensureFolder()
        const created = await drive.createFile(untitled, emptySceneJson(), folderId)
        navigate(`/edit/${created.id}`, { replace: true })
      } catch {
        setFailed(true)
      }
    })()
  }, [drive, navigate, untitled])

  if (failed) {
    return (
      <main className="page">
        <p>{t.editor.createFailed}</p>
        <Link to="/app">{t.editor.backToFiles}</Link>
      </main>
    )
  }
  return <p className="page">{t.editor.creating}</p>
}
