import type { Filter, Task } from './types'

export type FilterConfig = {
  // Button text in FilterBar, also used in "It's no longer shown in X."
  label: string
  // Used in "Showing X tasks (N)".
  spokenName: string
  // Shown by TaskList when no task matches.
  emptyMessage: string
  matches: (task: Task) => boolean
}

export const FILTERS: Record<Filter, FilterConfig> = {
  all: {
    label: 'All',
    spokenName: 'all',
    emptyMessage: 'No tasks yet.',
    matches: () => true,
  },
  active: {
    label: 'Active',
    spokenName: 'active',
    emptyMessage: 'No active tasks.',
    matches: (task) => !task.done,
  },
  done: {
    label: 'Done',
    spokenName: 'completed',
    emptyMessage: 'No completed tasks.',
    matches: (task) => task.done,
  },
}

// Button order in FilterBar.
export const FILTER_ORDER: Filter[] = ['all', 'active', 'done']
