function newBoundary(): string {
  return `rabisco-${crypto.randomUUID()}`
}

export function buildMultipart(metadata: object, content: string, contentType: string): { body: string; contentType: string } {
  let boundary = newBoundary()
  while (content.includes(boundary)) boundary = newBoundary()
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\nContent-Type: ${contentType}\r\n\r\n${content}\r\n--${boundary}--`
  return { body, contentType: `multipart/related; boundary=${boundary}` }
}
