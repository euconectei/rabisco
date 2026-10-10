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

// renderFailed: the image itself could not be made (e.g. too large a canvas at 3×); failed: Drive refused it.
type Status = { kind: 'idle' } | { kind: 'saving' } | { kind: 'saved'; name: string } | { kind: 'failed' } | { kind: 'renderFailed' }

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
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

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

  async function renderOrReport() {
    try {
      return await render()
    } catch {
      setStatus({ kind: 'renderFailed' })
      return null
    }
  }

  async function download() {
    setStatus({ kind: 'idle' })
    const image = await renderOrReport()
    if (image) downloadBlob(image.blob, fileName)
  }

  async function saveToDrive() {
    setStatus({ kind: 'saving' })
    const image = await renderOrReport()
    if (!image) return
    try {
      const created = await drive.createSibling(fileName, image.blob, image.mimeType, fileId)
      setStatus({ kind: 'saved', name: created.name })
    } catch {
      setStatus({ kind: 'failed' })
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
      {status.kind === 'saved' && <p role="status">{formatMessage(labels.saved, { name: status.name })}</p>}
      {status.kind === 'failed' && <p role="alert">{labels.failed}</p>}
      {status.kind === 'renderFailed' && <p role="alert">{labels.renderFailed}</p>}
      <div className="dialog-actions">
        <button type="button" className="button" onClick={() => void download()}>
          {labels.download}
        </button>
        <button type="button" className="button-secondary" disabled={status.kind === 'saving'} onClick={() => void saveToDrive()}>
          {status.kind === 'saving' ? labels.saving : labels.saveToDrive}
        </button>
        <button type="button" className="button-secondary" onClick={onClose}>
          {labels.close}
        </button>
      </div>
    </Dialog>
  )
}
