import { useEffect, useRef, useState } from 'react'
import type { Task } from '../types'
import { describeDueDate, getToday, isOverdue, type Today } from '../dueDate'
import { focusRing, focusRingDanger, panel } from '../styles'
import ConfirmDialog from './ConfirmDialog'

type TaskListProps = {
  tasks: Task[]
  emptyMessage: string
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onEmptied?: () => void
  // Used to word due dates ("Due today", "Overdue"). Defaults to the real today.
  today?: Today
}

// After a toggle: the toggled task's id and the id of the checkbox to focus if
// that task is no longer in the list (null when no task is left). Only acted
// on once leavingId is actually gone, so a toggle that keeps the task visible
// (filter 'all') leaves focus where it is.
type PendingFocus = {
  leavingId: string
  neighbourId: string | null
}

// Where focus goes once the confirm dialog has closed (cancel, confirm, or
// the task vanishing). Created as a new object per close, so the effect that
// handles it runs exactly once per close.
// - taskId's Delete button, if that task is still in the list (cancel, or a
//   confirm the parent hasn't acted on);
// - else neighbourId's checkbox;
// - else, with no task left, onEmptied or the empty message.
type CloseFocus = {
  taskId: string
  neighbourId: string | null
  whenEmpty: 'onEmptied' | 'emptyMessage'
}

export default function TaskList({
  tasks,
  emptyMessage,
  onToggle,
  onDelete,
  onEmptied,
  today = getToday(),
}: TaskListProps) {
  const checkboxRefs = useRef(new Map<string, HTMLInputElement>())
  const emptyRef = useRef<HTMLParagraphElement>(null)
  const pendingFocus = useRef<PendingFocus | null>(null)
  const deleteButtonRefs = useRef(new Map<string, HTMLButtonElement>())
  // Id of the task whose delete is awaiting confirmation (one at a time).
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const confirmingTask =
    confirmingId === null
      ? undefined
      : tasks.find((t) => t.id === confirmingId)
  const [closeFocus, setCloseFocus] = useState<CloseFocus | null>(null)
  // The closeFocus request last acted on, so later re-runs (e.g. a new
  // onEmptied) can't move focus again.
  const handledCloseFocus = useRef<CloseFocus | null>(null)

  // The task being confirmed left the list (the dialog is already closed
  // because confirmingTask is undefined). Forget it during render, React's
  // "adjust state when props change" pattern, so it can't reopen if the task
  // comes back.
  if (confirmingId !== null && !confirmingTask) {
    setConfirmingId(null)
    setCloseFocus({
      taskId: confirmingId,
      neighbourId: tasks[0]?.id ?? null,
      whenEmpty: 'emptyMessage',
    })
  }

  useEffect(() => {
    const pending = pendingFocus.current
    if (!pending) return
    // Clear on every run, used or not, so a stale value can't pull focus later.
    pendingFocus.current = null
    if (tasks.some((t) => t.id === pending.leavingId)) return
    if (pending.neighbourId) {
      checkboxRefs.current.get(pending.neighbourId)?.focus()
    } else {
      emptyRef.current?.focus()
    }
  }, [tasks])

  // The one place focus moves after the dialog closes. It runs in the commit
  // that closes the dialog, after ConfirmDialog's cleanup (React runs all
  // effect cleanups before new effects), so the page is no longer inert. On
  // confirm the parent's synchronous delete lands in the same commit, so the
  // refs already reflect whether the task survived. Each request is handled
  // once and then forgotten, so nothing is left to pull focus later.
  useEffect(() => {
    if (!closeFocus || handledCloseFocus.current === closeFocus) return
    handledCloseFocus.current = closeFocus
    const deleteButton = deleteButtonRefs.current.get(closeFocus.taskId)
    if (deleteButton) {
      deleteButton.focus()
    } else if (closeFocus.neighbourId !== null) {
      checkboxRefs.current.get(closeFocus.neighbourId)?.focus()
    } else if (closeFocus.whenEmpty === 'onEmptied') {
      onEmptied?.()
    } else {
      emptyRef.current?.focus()
    }
  }, [closeFocus, onEmptied])

  // The checkbox after the task (else before it), or null if it's the only one.
  function neighbourOf(id: string) {
    const index = tasks.findIndex((t) => t.id === id)
    if (index === -1) return null
    const neighbour = tasks[index + 1] ?? tasks[index - 1]
    return neighbour ? neighbour.id : null
  }

  function requestDelete(id: string) {
    if (confirmingId !== null) return
    setConfirmingId(id)
  }

  function closeDialog(id: string) {
    setConfirmingId(null)
    setCloseFocus({
      taskId: id,
      neighbourId: neighbourOf(id),
      whenEmpty: 'onEmptied',
    })
  }

  function cancelDelete() {
    if (confirmingId !== null) closeDialog(confirmingId)
  }

  // Close first, so the close and a synchronous delete land in one commit.
  // If onDelete throws, the close is already queued and focus still lands.
  function confirmDelete() {
    if (!confirmingTask) return
    const id = confirmingTask.id
    closeDialog(id)
    onDelete(id)
  }

  function handleToggle(id: string) {
    const index = tasks.findIndex((t) => t.id === id)
    pendingFocus.current =
      index === -1 ? null : { leavingId: id, neighbourId: neighbourOf(id) }
    onToggle(id)
  }

  // Rendered in both branches so it never unmounts mid-flow; it portals to
  // <body> and is only open while the confirmed task is still in the list.
  const dialog = (
    <ConfirmDialog
      open={confirmingTask !== undefined}
      title="Delete task?"
      message={
        confirmingTask
          ? `"${confirmingTask.title}" will be permanently deleted.`
          : ''
      }
      confirmLabel="Delete"
      onConfirm={confirmDelete}
      onCancel={cancelDelete}
    />
  )

  if (tasks.length === 0) {
    return (
      <>
        <p
          ref={emptyRef}
          id="task-list-empty"
          tabIndex={-1}
          className={`rounded-md border border-dashed border-slate-300 p-6 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400 ${focusRing}`}
        >
          {emptyMessage}
        </p>
        {dialog}
      </>
    )
  }

  return (
    <>
      <ul
        aria-label="Tasks"
        className={`divide-y divide-slate-200 dark:divide-slate-800 ${panel}`}
      >
        {tasks.map((task) => {
          const inputId = `task-${task.id}`
          const dueId = `task-${task.id}-due`
          const dueText = describeDueDate(task, today)
          const overdue = isOverdue(task, today)
          return (
            <li key={task.id} className="flex items-center gap-3 px-3 py-3">
              <input
                ref={(el) => {
                  if (el) checkboxRefs.current.set(task.id, el)
                  return () => {
                    checkboxRefs.current.delete(task.id)
                  }
                }}
                id={inputId}
                type="checkbox"
                checked={task.done}
                onChange={() => handleToggle(task.id)}
                aria-describedby={dueText ? dueId : undefined}
                className={`size-6 shrink-0 accent-indigo-600 dark:accent-indigo-400 ${focusRing}`}
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <label
                  htmlFor={inputId}
                  className={`cursor-pointer break-words ${
                    task.done
                      ? 'text-slate-500 line-through dark:text-slate-400'
                      : 'text-slate-900 dark:text-slate-100'
                  }`}
                >
                  {task.title}
                </label>
                {dueText && (
                  <span
                    id={dueId}
                    className={`text-sm ${
                      overdue
                        ? 'font-medium text-red-700 dark:text-red-400'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {dueText}
                  </span>
                )}
              </div>
              <button
                ref={(el) => {
                  if (el) deleteButtonRefs.current.set(task.id, el)
                  return () => {
                    deleteButtonRefs.current.delete(task.id)
                  }
                }}
                type="button"
                onClick={() => requestDelete(task.id)}
                aria-label={`Delete "${task.title}"`}
                aria-haspopup="dialog"
                className={`shrink-0 rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-red-50 hover:text-red-700 dark:text-slate-400 dark:hover:bg-red-950 dark:hover:text-red-400 ${focusRingDanger}`}
              >
                Delete
              </button>
            </li>
          )
        })}
      </ul>
      {dialog}
    </>
  )
}
