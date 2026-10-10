import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import { useEffect, useState } from 'react'
import { useDrive } from '../drive/useDrive'
import { Dialog } from '../editor/Dialog'
import { downloadBlob } from '../editor/download'
import { format as formatMessage } from '../i18n/format'
import { useI18n } from '../i18n/useI18n'
import { loadExportOptions, saveExportOptions } from './exportOptions'
import { exportFileName, renderImage, type ExportOptions, type ExportScale } from './imageExport'

const SCALES: ExportScale[] = [1, 2, 3]

type DriveState = { kind: 'idle' } | { kind: 'saving' } | { kind: 'saved'; name: string } | { kind: 'failed' }

export function ExportImageDialog({ api, baseName, fileId, onClose }: { api: ExcalidrawImperativeAPI; baseName: string; fileId: string; onClose: () => void }) {
  const { t } = useI18n()
  const labels = t.exportImage
  const drive = useDrive()
  const selected = api.getAppState().selectedElementIds
  const hasSelection = Object.values(selected).some(Boolean)
  const [options, setOptions] = useState<ExportOptions>(() => {
    const saved = loadExportOptions()
    return hasSelection ? saved : { ...saved, scope: 'scene' }
  })
  const [driveState, setDriveState] = useState<DriveState>({ kind: 'idle' })

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  function change(next: Partial<ExportOptions>) {
    const updated = { ...options, ...next }
    setOptions(updated)
    saveExportOptions(updated)
  }

  // Read the scene at click time, so the export reflects what is on the canvas right now.
  function render() {
    const scene = { elements: api.getSceneElements(), appState: api.getAppState(), files: api.getFiles() }
    return renderImage(scene, api.getAppState().selectedElementIds, options)
  }

  const fileName = exportFileName(baseName, options.format, t.files.untitled)

  async function download() {
    const { blob } = await render()
    downloadBlob(blob, fileName)
  }

  async function saveToDrive() {
    setDriveState({ kind: 'saving' })
    try {
      const { blob, mimeType } = await render()
      const created = await drive.createSibling(fileName, blob, mimeType, fileId)
      setDriveState({ kind: 'saved', name: created.name })
    } catch {
      setDriveState({ kind: 'failed' })
    }
  }

  return (
    <Dialog title={labels.title}>
      <div className="export-options">
        <fieldset>
          <legend>{labels.format}</legend>
          {(['png', 'svg'] as const).map((value) => (
            <label key={value}>
              <input type="radio" name="export-format" checked={options.format === value} onChange={() => change({ format: value })} />
              {value.toUpperCase()}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>{labels.scope}</legend>
          <label>
            <input type="radio" name="export-scope" checked={options.scope === 'scene'} onChange={() => change({ scope: 'scene' })} />
            {labels.scopeScene}
          </label>
          <label>
            <input
              type="radio"
              name="export-scope"
              checked={options.scope === 'selection'}
              disabled={!hasSelection}
              onChange={() => change({ scope: 'selection' })}
            />
            {labels.scopeSelection}
          </label>
        </fieldset>
        <fieldset>
          <legend>{labels.scale}</legend>
          {SCALES.map((value) => (
            <label key={value}>
              <input type="radio" name="export-scale" checked={options.scale === value} onChange={() => change({ scale: value })} />
              {value}×
            </label>
          ))}
        </fieldset>
        <label>
          <input type="checkbox" checked={options.background} onChange={(event) => change({ background: event.currentTarget.checked })} />
          {labels.background}
        </label>
        <label>
          <input type="checkbox" checked={options.darkMode} onChange={(event) => change({ darkMode: event.currentTarget.checked })} />
          {labels.darkMode}
        </label>
        <label>
          <input type="checkbox" checked={options.embedScene} onChange={(event) => change({ embedScene: event.currentTarget.checked })} />
          {labels.embedScene}
        </label>
        <p className="export-hint">{labels.embedSceneHint}</p>
      </div>
      {driveState.kind === 'saved' && <p role="status">{formatMessage(labels.saved, { name: driveState.name })}</p>}
      {driveState.kind === 'failed' && <p role="alert">{labels.failed}</p>}
      <div className="dialog-actions">
        <button type="button" className="button" onClick={() => void download()}>
          {labels.download}
        </button>
        <button type="button" className="button-secondary" disabled={driveState.kind === 'saving'} onClick={() => void saveToDrive()}>
          {driveState.kind === 'saving' ? labels.saving : labels.saveToDrive}
        </button>
        <button type="button" className="button-secondary" onClick={onClose}>
          {labels.close}
        </button>
      </div>
    </Dialog>
  )
}
