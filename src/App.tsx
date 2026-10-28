import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Filter, Task } from './types'
import { FILTERS } from './filters'
import AddTaskForm from './components/AddTaskForm'
import FilterBar from './components/FilterBar'
import Header from './components/Header'
import TaskList from './components/TaskList'

// Gap between clearing the live region and setting the new message. Long
// enough for screen readers to register the empty state, so a repeated
// identical message is announced again.
const ANNOUNCE_DELAY_MS = 100

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [announcement, setAnnouncement] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const announceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const visibleTasks = useMemo(
    () => tasks.filter(FILTERS[filter].matches),
    [tasks, filter],
  )

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

  function addTask(title: string) {
    setTasks((prev) => [
      ...prev,
      { id: crypto.randomUUID(), title, done: false },
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
    // Outside 'all', a toggled task always leaves the current filter.
    announce(
      filter === 'all'
        ? base
        : `${base}. It's no longer shown in ${FILTERS[filter].label}.`,
    )
  }

  function changeFilter(next: Filter) {
    setFilter(next)
    const { spokenName, matches } = FILTERS[next]
    const count = tasks.filter(matches).length
    announce(`Showing ${spokenName} tasks (${count})`)
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
        <TaskList
          tasks={visibleTasks}
          emptyMessage={FILTERS[filter].emptyMessage}
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
