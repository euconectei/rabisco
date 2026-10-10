import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useDrive } from '../drive/useDrive'
import { useI18n } from '../i18n/useI18n'
import { importOutline } from '../mindmap/importMap'
import { parseMarkdownOutline } from '../mindmap/markdown'
import { emptySceneJson, serializeScene } from './scene'

interface ImportState {
  importMarkdown?: { name: string; text: string }
  /** A scene recovered from an exported image, already serialized. */
  importScene?: { name: string; json: string }
}

/** A drawing holding the markdown as a mind map (a text with no list or heading becomes a lone root). */
function importedSceneJson(name: string, text: string): string {
  const outline = parseMarkdownOutline(text, name) ?? { text: name, children: [] }
  const { elements } = importOutline([], outline, { x: 0, y: 0 })
  return serializeScene({ elements, appState: {}, files: {} })
}

// /edit/new: creates the file in Drive first, then replaces the URL with /edit/<id>.
export default function NewFileRedirect() {
  const drive = useDrive()
  const { t } = useI18n()
  const navigate = useNavigate()
  const state = useLocation().state as ImportState | null
  const imported = state?.importMarkdown
  const importedScene = state?.importScene
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
        const created = importedScene
          ? await drive.createFile(importedScene.name, importedScene.json, folderId)
          : imported
            ? await drive.createFile(imported.name, importedSceneJson(imported.name, imported.text), folderId)
            : await drive.createFile(untitled, emptySceneJson(), folderId)
        navigate(`/edit/${created.id}`, { replace: true })
      } catch {
        setFailed(true)
      }
    })()
  }, [drive, navigate, untitled, imported, importedScene])

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
