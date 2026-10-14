/** Ids of drawings kept in this browser start with this prefix; Drive ids never do. */
export const LOCAL_PREFIX = 'local-'

export function newLocalId(): string {
  return `${LOCAL_PREFIX}${crypto.randomUUID()}`
}

export function isLocalId(id: string): boolean {
  return id.startsWith(LOCAL_PREFIX)
}
