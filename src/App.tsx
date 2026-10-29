import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { DueFilter, Filter, Task } from './types'
import { FILTERS } from './filters'
import { DUE_FILTERS, getToday, type Today } from './dueDate'
import { getTaskSummary } from './summary'
import AddTaskForm from './components/AddTaskForm'
import DueFilterBar from './components/DueFilterBar'
import FilterBar from './components/FilterBar'
import Header from './components/Header'
import TaskList from './components/TaskList'
import TaskSummaryBar from './components/TaskSummaryBar'

// Gap between clearing the live region and setting the new message. Long
// enough for screen readers to register the empty state, so a repeated
// identical message is announced again.
const ANNOUNCE_DELAY_MS = 100

function matchesView(task: Task, filter: Filter, dueFilter: DueFilter, today: Today) {
  return FILTERS[filter].matches(task) && DUE_FILTERS[dueFilter].matches(task, today)
}

// "active tasks", or "active tasks due today" when a due filter is set.
function describeView(filter: Filter, dueFilter: DueFilter) {
  const base = `${FILTERS[filter].spokenName} tasks`
  return dueFilter === 'all' ? base : `${base} ${DUE_FILTERS[dueFilter].phrase}`
}

function emptyMessageFor(filter: Filter, dueFilter: DueFilter) {
  if (dueFilter === 'all') return FILTERS[filter].emptyMessage
  if (filter === 'all') return DUE_FILTERS[dueFilter].emptyMessage
  return `No ${describeView(filter, dueFilter)}.`
}

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [dueFilter, setDueFilter] = useState<DueFilter>('all')
  const [announcement, setAnnouncement] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const announceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Read on every render; only a change of day yields a new object, so the
  // memo below isn't invalidated by unrelated renders.
  const { key: todayKey, endOfWeekKey } = getToday()
  const today = useMemo<Today>(
    () => ({ key: todayKey, endOfWeekKey }),
    [todayKey, endOfWeekKey],
  )

  const visibleTasks = useMemo(
    () => tasks.filter((t) => matchesView(t, filter, dueFilter, today)),
    [tasks, filter, dueFilter, today],
  )

  // Counts every task, regardless of the current filters.
  const summary = useMemo(() => getTaskSummary(tasks), [tasks])

  useEffect(() => {
    return () => {
      if (announceTimer.current !== null) clearTimeout(announceTimer.current)
    }
  }, [])

  // Clear the region now, then set the message after ANNOUNCE_DELAY_MS, so
  // repeated identical messages are announced every time. The delay also lets
  // any focus move from this render (e.g. after a delete) happen first.
  // A newer call cancels a pending one, so only the latest message is set.
  // The delete announcement relies on this delay: the live region is inside
  // #root, which the confirm dialog makes inert while open, so the message
  // must be set after the dialog has closed to be spoken.
  function announce(message: string) {
    if (announceTimer.current !== null) clearTimeout(announceTimer.current)
    setAnnouncement('')
    announceTimer.current = setTimeout(() => {
      announceTimer.current = null
      setAnnouncement(message)
    }, ANNOUNCE_DELAY_MS)
  }

  function addTask(title: string, dueDate?: string) {
    setTasks((prev) => [
      ...prev,
      { id: crypto.randomUUID(), title, done: false, dueDate },
    ])
    announce(`Added "${title}"`)
  }

  function toggleTask(id: string) {
    const task = tasks.find((t) => t.id === id)
    if (!task) return
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    )
    const base = task.done
      ? `Marked "${task.title}" as active`
      : `Completed "${task.title}"`
    // Name the filter that now hides the task, if any.
    const toggled = { ...task, done: !task.done }
    const hiddenBy = !FILTERS[filter].matches(toggled)
      ? FILTERS[filter].label
      : !DUE_FILTERS[dueFilter].matches(toggled, today)
        ? DUE_FILTERS[dueFilter].label
        : null
    announce(hiddenBy ? `${base}. It's no longer shown in ${hiddenBy}.` : base)
  }

  function announceView(nextFilter: Filter, nextDue: DueFilter) {
    const count = tasks.filter((t) =>
      matchesView(t, nextFilter, nextDue, today),
    ).length
    announce(`Showing ${describeView(nextFilter, nextDue)} (${count})`)
  }

  function changeFilter(next: Filter) {
    setFilter(next)
    announceView(next, dueFilter)
  }

  function changeDueFilter(next: DueFilter) {
    setDueFilter(next)
    announceView(filter, next)
  }

  function deleteTask(id: string) {
    const task = tasks.find((t) => t.id === id)
    if (!task) return
    setTasks((prev) => prev.filter((t) => t.id !== id))
    announce(`Deleted "${task.title}"`)
  }

  const focusAddInput = useCallback(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <div className="min-h-screen">
      <main className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-10">
        <Header />
        <AddTaskForm
          onAdd={addTask}
          inputRef={inputRef}
          onInvalid={announce}
        />
        <FilterBar filter={filter} onChange={changeFilter} />
        <DueFilterBar filter={dueFilter} onChange={changeDueFilter} />
        <TaskSummaryBar summary={summary} />
        <TaskList
          tasks={visibleTasks}
          today={today}
          emptyMessage={emptyMessageFor(filter, dueFilter)}
          onToggle={toggleTask}
          onDelete={deleteTask}
          onEmptied={focusAddInput}
        />
      </main>
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </div>
  )
}
