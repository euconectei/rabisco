import 'vitest-canvas-mock'
import { loadFromBlob, serializeAsJSON } from '@excalidraw/excalidraw'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import { crc32, encodePngMetadata, sceneEnvelope, toByteString } from './png'

const TEXT = 'áç😀'

// A real 1x1 transparent PNG, so the "rest of the PNG stays intact" test runs on
// valid chunk structure (IHDR, IDAT, IEND).
const BASE_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

const textElement = {
  id: 'text-1',
  type: 'text',
  x: 0,
  y: 0,
  width: 120,
  height: 25,
  angle: 0,
  strokeColor: '#1e1e1e',
  backgroundColor: 'transparent',
  fillStyle: 'solid',
  strokeWidth: 2,
  strokeStyle: 'solid',
  roughness: 1,
  opacity: 100,
  groupIds: [],
  frameId: null,
  roundness: null,
  seed: 5678,
  version: 2,
  versionNonce: 77,
  isDeleted: false,
  boundElements: null,
  updated: 1760000000000,
  link: null,
  locked: false,
  text: TEXT,
  fontSize: 20,
  fontFamily: 5,
  textAlign: 'left',
  verticalAlign: 'top',
  containerId: null,
  originalText: TEXT,
  autoResize: true,
  lineHeight: 1.25,
} as unknown as ExcalidrawElement

function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

function readUint32BE(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset).getUint32(offset)
}

function parseChunks(bytes: Uint8Array): Array<{ type: string; data: Uint8Array; offset: number }> {
  const chunks: Array<{ type: string; data: Uint8Array; offset: number }> = []
  let offset = 8
  while (offset < bytes.length) {
    const length = readUint32BE(bytes, offset)
    const type = String.fromCharCode(bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7])
    chunks.push({ type, data: bytes.slice(offset + 8, offset + 8 + length), offset })
    offset += 12 + length
  }
  return chunks
}

describe('toByteString', () => {
  it('maps each UTF-8 byte to a single character', () => {
    const byteString = toByteString('áç😀')
    expect(byteString.length).toBe(new TextEncoder().encode('áç😀').length)
    const bytes = Uint8Array.from(byteString, (char) => char.charCodeAt(0))
    expect(new TextDecoder().decode(bytes)).toBe('áç😀')
  })
})

describe('crc32', () => {
  it('matches the standard CRC-32 check value', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926)
  })

  it('matches the CRC-32 of the IEND chunk', () => {
    expect(crc32(new TextEncoder().encode('IEND'))).toBe(0xae426082)
  })
})

describe('sceneEnvelope', () => {
  it('round-trips accented text and emoji with compressed:false', () => {
    const sceneJson = serializeAsJSON([textElement], {}, {}, 'local')
    const envelope = sceneEnvelope(sceneJson)
    const { version, encoding, compressed, encoded } = JSON.parse(envelope) as {
      version: string
      encoding: string
      compressed: boolean
      encoded: string
    }
    expect(version).toBe('1')
    expect(encoding).toBe('bstring')
    expect(compressed).toBe(false)
    const bytes = Uint8Array.from(encoded, (char) => char.charCodeAt(0))
    expect(new TextDecoder().decode(bytes)).toBe(sceneJson)
    expect(sceneJson).toContain('áç😀')
  })
})

describe('encodePngMetadata', () => {
  it('inserts a tEXt chunk right before IEND with a valid CRC, leaving the rest intact', async () => {
    const baseBytes = base64ToBytes(BASE_PNG_BASE64)
    const sceneJson = serializeAsJSON([textElement], {}, {}, 'local')
    const blob = new Blob([baseBytes], { type: 'image/png' })
    const embedded = new Uint8Array(await (await encodePngMetadata(blob, sceneJson)).arrayBuffer())

    const baseChunks = parseChunks(baseBytes)
    const embeddedChunks = parseChunks(embedded)
    expect(baseChunks[baseChunks.length - 1].type).toBe('IEND')
    expect(embeddedChunks).toHaveLength(baseChunks.length + 1)
    expect(embeddedChunks[embeddedChunks.length - 1].type).toBe('IEND')

    const textChunk = embeddedChunks[embeddedChunks.length - 2]
    expect(textChunk.type).toBe('tEXt')

    // The chunk's stored CRC must match a freshly computed CRC over type + data.
    const storedCrc = readUint32BE(embedded, textChunk.offset + 8 + textChunk.data.length)
    const typeAndData = new Uint8Array(4 + textChunk.data.length)
    typeAndData.set([0x74, 0x45, 0x58, 0x74], 0) // "tEXt"
    typeAndData.set(textChunk.data, 4)
    expect(storedCrc).toBe(crc32(typeAndData))

    // Everything before the inserted chunk (signature + IHDR + IDAT) and the IEND
    // trailer must be byte-for-byte identical to the original.
    expect(embedded.slice(0, textChunk.offset)).toEqual(baseBytes.slice(0, baseChunks[baseChunks.length - 1].offset))
    expect(embedded.slice(-12)).toEqual(baseBytes.slice(-12))
  })

  it('round-trips a scene through encodePngMetadata and loadFromBlob', async () => {
    const sceneJson = serializeAsJSON([textElement], {}, {}, 'local')
    const baseBytes = base64ToBytes(BASE_PNG_BASE64)
    const embedded = await encodePngMetadata(new Blob([baseBytes], { type: 'image/png' }), sceneJson)
    const restored = await loadFromBlob(embedded, null, null)
    const text = restored.elements.find((element) => element.type === 'text') as { text: string } | undefined
    expect(text?.text).toBe(TEXT)
  })
})
