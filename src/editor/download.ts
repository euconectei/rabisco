export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  // Revoking right away cancels the download in some Safari/Firefox versions.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
