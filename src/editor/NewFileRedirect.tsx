import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ErrorScreen, LoadingScreen } from '../components/LoadingScreen'
import { useDrive } from '../drive/useDrive'
import { useI18n } from '../i18n/useI18n'
import { importOutline } from '../mindmap/importMap'
import { parseMarkdownOutline } from '../mindmap/outline'
import { templateImagePath, templatesIndexPath } from '../templates/paths'
import type { Template } from '../templates/types'
import { trackCreated } from '../usage/track'
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

// /edit/new: creates the file in Drive first, then replaces the URL with /edit/<id>. `?template=<id>`
// starts it from a template page's map or flowchart.
export default function NewFileRedirect() {
  const drive = useDrive()
  const { lang, t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as ImportState | null
  const templateId = new URLSearchParams(location.search).get('template')
  // The templates' code and text load only when a template is asked for: undefined while loading, null if unknown.
  const [template, setTemplate] = useState<Template | null | undefined>(undefined)
  const missingTemplate = templateId !== null && template === null
  const imported = state?.importMarkdown
  const importedScene = state?.importScene
  const [failed, setFailed] = useState(false)
  const [step, setStep] = useState<'folder' | 'file'>('folder')
  // Bumped by "try again": the effect below runs once per attempt.
  const [attempt, setAttempt] = useState(0)
  const startedAttempt = useRef<number | null>(null)
  const untitled = t.files.untitled

  useEffect(() => {
    if (templateId === null) return
    let live = true
    void import('../templates/registry').then(({ templateById }) => {
      if (live) setTemplate(templateById(templateId) ?? null)
    })
    return () => {
      live = false
    }
  }, [templateId])

  useEffect(() => {
    // StrictMode runs effects twice; the ref keeps us from creating two files.
    if (startedAttempt.current === attempt || (templateId !== null && !template)) return
    startedAttempt.current = attempt
    void (async () => {
      try {
        const folderId = await drive.ensureFolder()
        setStep('file')
        const created = template
          ? await import('../templates/startScene').then(async ({ templateLocale, templateSceneJson }) =>
              drive.createFile(templateLocale(template, lang).title, await templateSceneJson(template, lang), folderId),
            )
          : importedScene
          ? await drive.createFile(importedScene.name, importedScene.json, folderId)
          : imported
            ? await drive.createFile(imported.name, importedSceneJson(imported.name, imported.text), folderId)
            : await drive.createFile(untitled, emptySceneJson(), folderId)
        trackCreated(template ? 'template' : imported || importedScene ? 'import' : 'blank', template?.id ?? null, created.id, lang)
        navigate(`/edit/${created.id}`, { replace: true })
      } catch {
        setFailed(true)
      }
    })()
  }, [drive, navigate, untitled, imported, importedScene, template, templateId, lang, attempt])

  if (missingTemplate) {
    return (
      <main className="page">
        <p>{t.templates.notFound}</p>
        <Link to={templatesIndexPath(lang)}>{t.templates.backToIndex}</Link>
      </main>
    )
  }

  if (failed) {
    return (
      <ErrorScreen title={t.editor.createFailed}>
        <button
          type="button"
          className="button"
          onClick={() => {
            setStep('folder')
            setFailed(false)
            setAttempt((n) => n + 1)
          }}
        >
          {t.editor.retry}
        </button>
        <Link to="/app">{t.editor.backToFiles}</Link>
      </ErrorScreen>
    )
  }
  const locale = template?.locales[lang]
  return (
    <LoadingScreen
      title={t.editor.creating}
      detail={step === 'folder' ? t.loading.creatingFolder : t.loading.creatingFile}
      image={template && locale ? templateImagePath(template, lang) : undefined}
    />
  )
}
