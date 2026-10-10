import { Excalidraw, Footer, MainMenu, sceneCoordsToViewportCoords, viewportCoordsToSceneCoords } from '@excalidraw/excalidraw'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import '@excalidraw/excalidraw/index.css'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useDrive } from '../drive/useDrive'
import { format } from '../i18n/format'
import { LanguageSwitcher } from '../i18n/LanguageSwitcher'
import { useI18n } from '../i18n/useI18n'
import { ExportImageDialog } from '../export/ExportImageDialog'
import { exportableMap, mapToOutline, outlineToMarkdown } from '../mindmap/markdown'
import { toolbarPosition, touchTarget, TouchToolbar, useSettled, type TouchTarget } from '../mindmap/TouchToolbar'
import { useMindmap, type MindmapApi } from '../mindmap/useMindmap'
import { Dialog } from './Dialog'
import { downloadBlob } from './download'
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
  const [exportingImage, setExportingImage] = useState(false)
  // The map the export items act on (null: they are disabled).
  const [exportMapId, setExportMapId] = useState<string | null>(null)
  // Touch toolbar: the last pointer kind, the node it acts on, and the view (it hides while scrolling or zooming).
  const [pointerType, setPointerType] = useState('mouse')
  const [touch, setTouch] = useState<TouchTarget | null>(null)
  const [viewKey, setViewKey] = useState('')
  const [theme, setTheme] = useState('light')
  const viewSettled = useSettled(viewKey, 200)
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => setPointerType(event.pointerType || 'mouse')
    window.addEventListener('pointerdown', onPointerDown, true)
    return () => window.removeEventListener('pointerdown', onPointerDown, true)
  }, [])
  const mindmapLabels = useMemo(() => ({ rootText: t.mindmap.rootText, nodeText: t.mindmap.nodeText }), [t])
  // Excalidraw types updateScene's appState as a generic Pick; MindmapApi only needs a partial update.
  const mindmap = useMindmap(api as unknown as MindmapApi | null, mindmapLabels)
  const onSceneChange = file.onSceneChange
  const handleMindmapChange = mindmap.handleChange
  const onChange = useCallback<NonNullable<Parameters<typeof Excalidraw>[0]['onChange']>>(
    (elements, appState, files) => {
      onSceneChange(elements, appState, files)
      handleMindmapChange(elements, appState)
      const selected = Object.keys(appState.selectedElementIds).filter((id) => appState.selectedElementIds[id])
      setExportMapId(exportableMap(elements, selected))
      const target = touchTarget(elements, appState)
      setTouch((previous) => (JSON.stringify(previous) === JSON.stringify(target) ? previous : target))
      setViewKey(`${appState.scrollX}:${appState.scrollY}:${appState.zoom.value}`)
      setTheme(appState.theme ?? 'light')
    },
    [onSceneChange, handleMindmapChange],
  )
  const cancelPlacing = useCallback(() => setPlacing(false), [])
  const closeExport = useCallback(() => setExportingImage(false), [])
  function placeMap(client: { clientX: number; clientY: number }) {
    setPlacing(false)
    if (!api) return
    mindmap.createMapAt(viewportCoordsToSceneCoords(client, api.getAppState()))
  }
  const baseName = file.meta?.name.replace(/\.excalidraw$/i, '') ?? ''
  const fallbackRoot = baseName || t.mindmap.defaultRoot

  function mapMarkdown(): string | null {
    return api && exportMapId ? outlineToMarkdown(mapToOutline(api.getSceneElements(), exportMapId)) : null
  }

  function downloadMarkdown() {
    const markdown = mapMarkdown()
    if (markdown) downloadBlob(new Blob([markdown], { type: 'text/markdown' }), `${baseName || t.mindmap.defaultRoot}.md`)
  }

  async function saveMarkdownToDrive() {
    const markdown = mapMarkdown()
    if (markdown) await drive.createSibling(`${baseName || t.mindmap.defaultRoot}.md`, markdown, 'text/markdown', fileId)
  }

  const pasteOutline = mindmap.pasteOutline
  const onPaste = useCallback<NonNullable<Parameters<typeof Excalidraw>[0]['onPaste']>>(
    (data) => {
      if (!api || !data.text || data.elements?.length) return true
      const center = viewportCoordsToSceneCoords({ clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 }, api.getAppState())
      return !pasteOutline(data.text, center, fallbackRoot)
    },
    [api, pasteOutline, fallbackRoot],
  )

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
        onPaste={onPaste}
        UIOptions={{ canvasActions: { saveAsImage: false } }}
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
          <MainMenu.Item onSelect={() => setExportingImage(true)}>{t.exportImage.menuItem}</MainMenu.Item>
          <MainMenu.Item disabled={!exportMapId} onSelect={() => void attempt(async () => navigator.clipboard.writeText(mapMarkdown() ?? ''))}>
            {t.mindmap.copyAsText}
          </MainMenu.Item>
          <MainMenu.Item disabled={!exportMapId} onSelect={downloadMarkdown}>
            {t.mindmap.downloadMarkdown}
          </MainMenu.Item>
          <MainMenu.Item disabled={!exportMapId} onSelect={() => void attempt(saveMarkdownToDrive)}>
            {t.mindmap.saveMarkdownToDrive}
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
      {exportingImage && api && <ExportImageDialog api={api} baseName={baseName} fileId={fileId} onClose={closeExport} />}
      {api && touch && viewSettled && (pointerType === 'touch' || pointerType === 'pen') && (
        <TouchToolbar
            theme={theme}
            position={(() => {
              const { x, y } = sceneCoordsToViewportCoords({ sceneX: touch.x, sceneY: touch.y }, api.getAppState())
              return toolbarPosition(x, y)
            })()}
            collapsed={touch.collapsed}
            canCollapse={touch.hasChildren}
            labels={t.mindmap.touch}
            onAddChild={() => mindmap.perform({ type: 'addChild' })}
            onAddSibling={() => mindmap.perform({ type: 'addSibling' })}
            onToggleCollapse={() => mindmap.perform({ type: 'toggleCollapse' })}
            onDelete={() => mindmap.perform({ type: 'delete' })}
          />
      )}
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
