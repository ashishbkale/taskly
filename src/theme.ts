export type ThemePreference = 'light' | 'dark' | 'system'

// Source of truth for the theme key and class. The inline script in
// index.html hardcodes the same two values (it runs before the bundle and
// can't import this file), so keep it in sync when changing them.
export const THEME_STORAGE_KEY = 'taskly-theme'
export const DARK_CLASS = 'dark'

export const SYSTEM_DARK_QUERY = '(prefers-color-scheme: dark)'

// A saved 'light' or 'dark' wins; anything else (nothing saved, an unknown
// value, or storage unavailable) means follow the system.
export function readPreference(): ThemePreference {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // Storage unavailable: fall back to the system setting.
  }
  return 'system'
}

// 'system' removes the saved choice so the system setting is followed again.
export function savePreference(preference: ThemePreference): void {
  try {
    if (preference === 'system') {
      localStorage.removeItem(THEME_STORAGE_KEY)
    } else {
      localStorage.setItem(THEME_STORAGE_KEY, preference)
    }
  } catch {
    // Storage unavailable: the choice lasts for this session only.
  }
}

export function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia(SYSTEM_DARK_QUERY).matches
}

export function applyTheme(isDark: boolean): void {
  document.documentElement.classList.toggle(DARK_CLASS, isDark)
}
