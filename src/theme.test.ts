import {
  THEME_STORAGE_KEY,
  readPreference,
  savePreference,
  systemPrefersDark,
} from './theme'

describe('theme helpers', () => {
  afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  describe('readPreference', () => {
    it('returns a saved "light" or "dark"', () => {
      localStorage.setItem(THEME_STORAGE_KEY, 'light')
      expect(readPreference()).toBe('light')
      localStorage.setItem(THEME_STORAGE_KEY, 'dark')
      expect(readPreference()).toBe('dark')
    })

    it('returns "system" when nothing is saved', () => {
      expect(readPreference()).toBe('system')
    })

    it('returns "system" for an unknown saved value', () => {
      localStorage.setItem(THEME_STORAGE_KEY, 'system')
      expect(readPreference()).toBe('system')
      localStorage.setItem(THEME_STORAGE_KEY, 'Dark')
      expect(readPreference()).toBe('system')
    })

    it('returns "system" when storage throws', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('blocked')
      })
      expect(readPreference()).toBe('system')
    })
  })

  describe('savePreference', () => {
    it('stores "light" and "dark"', () => {
      savePreference('dark')
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
      savePreference('light')
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
    })

    it('removes the key for "system"', () => {
      localStorage.setItem(THEME_STORAGE_KEY, 'dark')
      savePreference('system')
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
    })

    it('does not throw when storage throws', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('blocked')
      })
      expect(() => savePreference('dark')).not.toThrow()
    })
  })

  describe('systemPrefersDark', () => {
    it('returns false without matchMedia', () => {
      expect(window.matchMedia).toBeUndefined()
      expect(systemPrefersDark()).toBe(false)
    })

    it('reflects the dark color-scheme query', () => {
      const matchMedia = vi.fn(() => ({ matches: true }))
      vi.stubGlobal('matchMedia', matchMedia)
      expect(systemPrefersDark()).toBe(true)
      expect(matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)')
    })
  })
})
