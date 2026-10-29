const focusOutlineBase =
  'focus-visible:outline-2 focus-visible:outline-offset-2'

export const focusRing = `${focusOutlineBase} focus-visible:outline-indigo-600 dark:focus-visible:outline-indigo-400`

export const focusRingDanger = `${focusOutlineBase} focus-visible:outline-red-600 dark:focus-visible:outline-red-400`

export const panel =
  'rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'

// Pressed/unpressed buttons in an aria-pressed group (FilterBar, DueFilterBar).
export function toggleButton(pressed: boolean) {
  return `rounded-md border px-4 py-1.5 text-sm font-medium transition-colors motion-reduce:transition-none ${
    pressed
      ? 'border-indigo-600 bg-indigo-600 text-white dark:border-indigo-400 dark:bg-indigo-400 dark:text-slate-950'
      : 'border-slate-500 bg-white text-slate-900 hover:bg-slate-100 dark:border-slate-400 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800'
  } ${focusRing}`
}
