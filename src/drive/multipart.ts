function newBoundary(): string {
  return `rabisco-${crypto.randomUUID()}`
}

// Text content keeps a string body; binary content (an exported PNG) becomes a Blob so its bytes
// go out untouched. A random UUID boundary cannot realistically collide with binary data.
export function buildMultipart(metadata: object, content: string, contentType: string): { body: string; contentType: string }
export function buildMultipart(metadata: object, content: string | Blob, contentType: string): { body: string | Blob; contentType: string }
export function buildMultipart(metadata: object, content: string | Blob, contentType: string): { body: string | Blob; contentType: string } {
  let boundary = newBoundary()
  while (typeof content === 'string' && content.includes(boundary)) boundary = newBoundary()
  const head =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\nContent-Type: ${contentType}\r\n\r\n`
  const tail = `\r\n--${boundary}--`
  const body = typeof content === 'string' ? `${head}${content}${tail}` : new Blob([head, content, tail])
  return { body, contentType: `multipart/related; boundary=${boundary}` }
}
