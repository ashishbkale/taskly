import type { DueFilter, Task } from './types'

// Due dates are stored as local calendar days, 'YYYY-MM-DD' (the value of an
// <input type="date">). Keys in this format compare correctly as strings.

export function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// The day context the due filters are evaluated against. Weeks run Monday to
// Sunday, so "this week" is today through the coming Sunday.
export type Today = { key: string; endOfWeekKey: string }

export function getToday(now: Date = new Date()): Today {
  const daysToSunday = (7 - now.getDay()) % 7
  const sunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysToSunday)
  return { key: toDateKey(now), endOfWeekKey: toDateKey(sunday) }
}

// Completed tasks are never overdue.
export function isOverdue(task: Task, today: Today): boolean {
  return !task.done && task.dueDate !== undefined && task.dueDate < today.key
}

export type DueFilterConfig = {
  // Button text in DueFilterBar, also used in "It's no longer shown in X."
  label: string
  // Used in "Showing tasks X (N)" and "No active tasks X."
  phrase: string
  // Shown by TaskList when no task matches and the status filter is 'all'.
  emptyMessage: string
  matches: (task: Task, today: Today) => boolean
}

export const DUE_FILTERS: Record<DueFilter, DueFilterConfig> = {
  all: {
    label: 'All',
    phrase: 'with any due date',
    emptyMessage: 'No tasks yet.',
    matches: () => true,
  },
  overdue: {
    label: 'Overdue',
    phrase: 'that are overdue',
    emptyMessage: 'No overdue tasks.',
    matches: isOverdue,
  },
  today: {
    label: 'Due today',
    phrase: 'due today',
    emptyMessage: 'No tasks due today.',
    matches: (task, today) => task.dueDate === today.key,
  },
  week: {
    label: 'Due this week',
    phrase: 'due this week',
    emptyMessage: 'No tasks due this week.',
    matches: (task, today) =>
      task.dueDate !== undefined &&
      task.dueDate >= today.key &&
      task.dueDate <= today.endOfWeekKey,
  },
  none: {
    label: 'No due date',
    phrase: 'with no due date',
    emptyMessage: 'No tasks without a due date.',
    matches: (task) => task.dueDate === undefined,
  },
}

// Button order in DueFilterBar.
export const DUE_FILTER_ORDER: DueFilter[] = ['all', 'overdue', 'today', 'week', 'none']

// Short text shown under a task's title, e.g. "Due today", "Overdue · Oct 27".
export function describeDueDate(task: Task, today: Today): string | null {
  if (task.dueDate === undefined) return null
  if (task.dueDate === today.key) return 'Due today'
  const formatted = fromDateKey(task.dueDate).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: task.dueDate.slice(0, 4) === today.key.slice(0, 4) ? undefined : 'numeric',
  })
  return isOverdue(task, today) ? `Overdue · ${formatted}` : `Due ${formatted}`
}
