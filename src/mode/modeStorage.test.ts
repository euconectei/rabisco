import { MODE_STORAGE_KEY, readMode, resetModeMemory, writeMode } from './modeStorage'

beforeEach(() => {
  localStorage.clear()
  resetModeMemory()
})
afterEach(() => vi.restoreAllMocks())

describe('mode storage', () => {
  it('defaults to google', () => {
    expect(readMode()).toBe('google')
  })

  it('keeps the local choice under rabisco.mode and reads it back', () => {
    writeMode('local')
    expect(MODE_STORAGE_KEY).toBe('rabisco.mode')
    expect(localStorage.getItem('rabisco.mode')).toBe('local')
    expect(readMode()).toBe('local')
  })

  it('clears the key when leaving the local mode', () => {
    writeMode('local')
    writeMode('google')
    expect(localStorage.getItem('rabisco.mode')).toBeNull()
    expect(readMode()).toBe('google')
  })

  it('ignores any other stored value', () => {
    localStorage.setItem('rabisco.mode', 'admin')
    expect(readMode()).toBe('google')
  })

  it('holds the choice in memory when storage refuses it', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    writeMode('local')
    expect(readMode()).toBe('local')
  })

  it('leaves the in-memory local mode when storage refuses the removal too', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    writeMode('local')
    writeMode('google')
    expect(readMode()).toBe('google')
  })

  it('falls back to google when storage cannot even be read', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(readMode()).toBe('google')
  })
})
