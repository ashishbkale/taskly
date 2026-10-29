import type { DueFilter } from '../types'
import { DUE_FILTERS, DUE_FILTER_ORDER } from '../dueDate'
import { toggleButton } from '../styles'

type DueFilterBarProps = {
  filter: DueFilter
  onChange: (filter: DueFilter) => void
}

export default function DueFilterBar({ filter, onChange }: DueFilterBarProps) {
  return (
    <div
      role="group"
      aria-label="Filter by due date"
      className="flex flex-wrap gap-2"
    >
      {DUE_FILTER_ORDER.map((value) => (
        <button
          key={value}
          type="button"
          aria-pressed={filter === value}
          onClick={() => onChange(value)}
          className={toggleButton(filter === value)}
        >
          {DUE_FILTERS[value].label}
        </button>
      ))}
    </div>
  )
}
