import type { Filter } from '../types'
import { FILTERS, FILTER_ORDER } from '../filters'
import { toggleButton } from '../styles'

type FilterBarProps = {
  filter: Filter
  onChange: (filter: Filter) => void
}

export default function FilterBar({ filter, onChange }: FilterBarProps) {
  return (
    <div role="group" aria-label="Filter tasks" className="flex flex-wrap gap-2">
      {FILTER_ORDER.map((value) => (
        <button
          key={value}
          type="button"
          aria-pressed={filter === value}
          onClick={() => onChange(value)}
          className={toggleButton(filter === value)}
        >
          {FILTERS[value].label}
        </button>
      ))}
    </div>
  )
}
