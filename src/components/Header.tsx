import { useEffect, useState } from 'react'
import { focusRing } from '../styles'
import {
  SYSTEM_DARK_QUERY,
  applyTheme,
  readPreference,
  savePreference,
  systemPrefersDark,
  type ThemePreference,
} from '../theme'

const themeOptions: { value: ThemePreference; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
]

export default function Header() {
  const [preference, setPreference] = useState<ThemePreference>(readPreference)

  useEffect(() => {
    if (preference !== 'system') {
      applyTheme(preference === 'dark')
      return
    }
    applyTheme(systemPrefersDark())
    if (typeof window.matchMedia !== 'function') return
    // Follow live system changes only while the preference is 'system'.
    const query = window.matchMedia(SYSTEM_DARK_QUERY)
    function handleChange(e: MediaQueryListEvent) {
      applyTheme(e.matches)
    }
    query.addEventListener('change', handleChange)
    return () => {
      query.removeEventListener('change', handleChange)
    }
  }, [preference])

  function choose(next: ThemePreference) {
    savePreference(next)
    setPreference(next)
  }

  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-3xl font-bold">Taskly</h1>
      <div role="group" aria-label="Theme" className="flex flex-wrap gap-2">
        {themeOptions.map(({ value, label }) => {
          const pressed = preference === value
          return (
            <button
              key={value}
              type="button"
              aria-pressed={pressed}
              onClick={() => choose(value)}
              className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors motion-reduce:transition-none ${
                pressed
                  ? 'border-indigo-600 bg-indigo-600 text-white dark:border-indigo-400 dark:bg-indigo-400 dark:text-slate-950'
                  : 'border-slate-500 bg-white text-slate-900 hover:bg-slate-100 dark:border-slate-400 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800'
              } ${focusRing}`}
            >
              {label}
            </button>
          )
        })}
      </div>
    </header>
  )
}
