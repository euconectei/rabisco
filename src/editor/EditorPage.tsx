import { Excalidraw, Footer, MainMenu, viewportCoordsToSceneCoords } from '@excalidraw/excalidraw'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import '@excalidraw/excalidraw/index.css'
import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useDrive } from '../drive/useDrive'
import { format } from '../i18n/format'
import { LanguageSwitcher } from '../i18n/LanguageSwitcher'
import { useI18n } from '../i18n/useI18n'
import { useMindmap, type MindmapApi } from '../mindmap/useMindmap'
import { Dialog } from './Dialog'
import { MindmapPlacement } from './MindmapPlacement'
import { SaveStatus } from './SaveStatus'
import { TitleField } from './TitleField'
import { useDriveFile } from './useDriveFile'

// Keyed by file id: opening another file (e.g. after "save as new") starts from a clean editor.
export default function EditorPage() {
  const { fileId = '' } = useParams()
  return <EditorScreen key={fileId} fileId={fileId} />
}

function EditorScreen({ fileId }: { fileId: string }) {
  const { lang, t } = useI18n()
  const navigate = useNavigate()
  const drive = useDrive()
  const file = useDriveFile(fileId)
  const [actionFailed, setActionFailed] = useState(false)
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null)
  const [placing, setPlacing] = useState(false)
  const mindmapLabels = useMemo(() => ({ rootText: t.mindmap.rootText, nodeText: t.mindmap.nodeText }), [t])
  // Excalidraw types updateScene's appState as a generic Pick; MindmapApi only needs a partial update.
  const mindmap = useMindmap(api as unknown as MindmapApi | null, mindmapLabels)
  const onSceneChange = file.onSceneChange
  const handleMindmapChange = mindmap.handleChange
  const onChange = useCallback<NonNullable<Parameters<typeof Excalidraw>[0]['onChange']>>(
    (elements, appState, files) => {
      onSceneChange(elements, appState, files)
      handleMindmapChange(elements, appState)
    },
    [onSceneChange, handleMindmapChange],
  )
  const cancelPlacing = useCallback(() => setPlacing(false), [])
  function placeMap(client: { clientX: number; clientY: number }) {
    setPlacing(false)
    if (!api) return
    mindmap.createMapAt(viewportCoordsToSceneCoords(client, api.getAppState()))
  }
  const baseName = file.meta?.name.replace(/\.excalidraw$/i, '') ?? ''

  async function attempt(action: () => Promise<unknown>) {
    setActionFailed(false)
    try {
      await action()
    } catch {
      setActionFailed(true)
    }
  }

  async function saveAsNew() {
    const json = file.currentJson()
    if (!json) return
    const folderId = await drive.ensureFolder()
    const created = await drive.createFile(`${baseName}${t.editor.copySuffix}`, json, folderId)
    navigate(`/edit/${created.id}`)
  }

  if (file.load.kind === 'loading') return <p className="page">{t.editor.opening}</p>
  if (file.load.kind === 'error') {
    return (
      <main className="page">
        <p>{t.editor.errors[file.load.reason]}</p>
        <Link to="/app">{t.editor.backToFiles}</Link>
      </main>
    )
  }
  if (file.load.kind === 'draft') {
    return (
      <Dialog title={t.editor.draft.title}>
        <p>{t.editor.draft.body}</p>
        <div className="dialog-actions">
          <button type="button" className="button" onClick={file.restoreDraft}>
            {t.editor.draft.restore}
          </button>
          <button type="button" className="button-secondary" onClick={file.discardDraft}>
            {t.editor.draft.discard}
          </button>
        </div>
      </Dialog>
    )
  }

  const scene = file.scene!
  return (
    <div className="editor">
      <Excalidraw
        key={file.sceneKey}
        langCode={lang}
        initialData={{ elements: scene.elements, appState: scene.appState, files: scene.files, scrollToContent: true }}
        excalidrawAPI={setApi}
        onChange={onChange}
        renderTopRightUI={() => (
          <div className="editor-top-right">
            <button type="button" className="button-secondary mindmap-button" onClick={() => setPlacing(true)}>
              {t.mindmap.button}
            </button>
            <TitleField key={baseName} name={baseName} onRename={file.rename} />
            <LanguageSwitcher />
          </div>
        )}
      >
        <MainMenu>
          <MainMenu.Item onSelect={() => navigate('/app')}>{t.editor.backToFiles}</MainMenu.Item>
          <MainMenu.Item onSelect={() => navigate('/whats-new')}>
            {format(t.whatsNew.menuItem, { version: `v${__APP_VERSION__}` })}
          </MainMenu.Item>
          <MainMenu.Separator />
          <MainMenu.DefaultItems.ToggleTheme />
          <MainMenu.DefaultItems.ChangeCanvasBackground />
        </MainMenu>
        <Footer>
          <SaveStatus status={file.status} lost={file.lost} onRetry={file.retry} onSaveAsNew={() => void attempt(saveAsNew)} />
        </Footer>
      </Excalidraw>
      {placing && <MindmapPlacement onPlace={placeMap} onCancel={cancelPlacing} />}
      {actionFailed && file.status !== 'conflict' && (
        <p className="action-error" role="alert">
          {t.editor.actionFailed}
        </p>
      )}
      {file.status === 'conflict' && (
        <Dialog title={t.editor.conflict.title}>
          <p>{t.editor.conflict.body}</p>
          {actionFailed && <p role="alert">{t.editor.actionFailed}</p>}
          <div className="dialog-actions">
            <button type="button" className="button" onClick={file.keepMine}>
              {t.editor.conflict.keepMine}
            </button>
            <button type="button" className="button-secondary" onClick={() => void attempt(file.useRemote)}>
              {t.editor.conflict.useRemote}
            </button>
          </div>
        </Dialog>
      )}
    </div>
  )
}
