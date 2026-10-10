const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

const TEXT_KEYWORD = 'application/vnd.excalidraw+json'

// Each character code becomes one byte of the UTF-8 encoding of text.
export function toByteString(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let result = ''
  for (const byte of bytes) result += String.fromCharCode(byte)
  return result
}

// CRC-32 (polynomial 0xEDB88320), the same checksum PNG chunks use.
export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

// Same envelope Excalidraw's encode() produces, with compressed:false.
export function sceneEnvelope(sceneJson: string): string {
  return JSON.stringify({
    version: '1',
    encoding: 'bstring',
    compressed: false,
    encoded: toByteString(sceneJson),
  })
}

function readUint32BE(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset).getUint32(offset)
}

function writeUint32BE(bytes: Uint8Array, offset: number, value: number): void {
  new DataView(bytes.buffer, bytes.byteOffset).setUint32(offset, value)
}

// tEXt is Latin-1: one byte per character. The envelope only holds ASCII and a byte string, so
// every character fits; encoding it as UTF-8 again would garble accents on the way back.
function latin1(text: string): Uint8Array {
  return Uint8Array.from(text, (char) => char.charCodeAt(0))
}

function buildTextChunk(keyword: string, text: string): Uint8Array {
  const data = latin1(`${keyword}\0${text}`)
  const type = latin1('tEXt')
  const typeAndData = new Uint8Array(type.length + data.length)
  typeAndData.set(type, 0)
  typeAndData.set(data, type.length)

  const chunk = new Uint8Array(12 + data.length)
  writeUint32BE(chunk, 0, data.length)
  chunk.set(type, 4)
  chunk.set(data, 8)
  writeUint32BE(chunk, 8 + data.length, crc32(typeAndData))
  return chunk
}

// Inserts a tEXt chunk carrying the scene envelope right before the IEND chunk.
export async function encodePngMetadata(blob: Blob, sceneJson: string): Promise<Blob> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  const textChunk = buildTextChunk(TEXT_KEYWORD, sceneEnvelope(sceneJson))

  const chunks: Uint8Array[] = []
  let offset = PNG_SIGNATURE.length
  while (offset < bytes.length) {
    const length = readUint32BE(bytes, offset)
    const chunk = bytes.slice(offset, offset + 12 + length)
    chunks.push(chunk)
    offset += 12 + length
  }

  const result = [PNG_SIGNATURE, ...chunks.slice(0, -1), textChunk, chunks[chunks.length - 1]]
  const length = result.reduce((sum, part) => sum + part.length, 0)
  const output = new Uint8Array(length)
  let cursor = 0
  for (const part of result) {
    output.set(part, cursor)
    cursor += part.length
  }

  return new Blob([output], { type: blob.type || 'image/png' })
}
