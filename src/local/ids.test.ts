import { isLocalId, LOCAL_PREFIX, newLocalId } from './ids'

describe('local ids', () => {
  it('creates ids that carry the local prefix and are recognised as local', () => {
    const id = newLocalId()
    expect(id.startsWith(LOCAL_PREFIX)).toBe(true)
    expect(isLocalId(id)).toBe(true)
  })

  it('creates a different id every time', () => {
    expect(newLocalId()).not.toBe(newLocalId())
  })

  it('does not treat Drive ids as local', () => {
    expect(isLocalId('1AbCdEfGhIjKlMnOpQrStUvWxYz')).toBe(false)
    expect(isLocalId('')).toBe(false)
    expect(isLocalId('file-1')).toBe(false)
  })
})
