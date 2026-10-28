import type { Filter } from '../types'
import { FILTERS, FILTER_ORDER } from '../filters'
import { focusRing } from '../styles'

type FilterBarProps = {
  filter: Filter
  onChange: (filter: Filter) => void
}

export default function FilterBar({ filter, onChange }: FilterBarProps) {
  return (
    <div role="group" aria-label="Filter tasks" className="flex flex-wrap gap-2">
      {FILTER_ORDER.map((value) => {
        const pressed = filter === value
        return (
          <button
            key={value}
            type="button"
            aria-pressed={pressed}
            onClick={() => onChange(value)}
            className={`rounded-md border px-4 py-1.5 text-sm font-medium transition-colors motion-reduce:transition-none ${
              pressed
                ? 'border-indigo-600 bg-indigo-600 text-white dark:border-indigo-400 dark:bg-indigo-400 dark:text-slate-950'
                : 'border-slate-500 bg-white text-slate-900 hover:bg-slate-100 dark:border-slate-400 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800'
            } ${focusRing}`}
          >
            {FILTERS[value].label}
          </button>
        )
      })}
    </div>
  )
}
