import { useRef, useState, type FormEvent, type RefObject } from 'react'
import { focusRing } from '../styles'

type AddTaskFormProps = {
  // dueDate is 'YYYY-MM-DD'; omitted when the field was left empty.
  onAdd: (title: string, dueDate?: string) => void
  inputRef?: RefObject<HTMLInputElement | null>
  // Called on a blank submit so the parent can announce the error (App passes
  // its live-region announce). The visible error is not itself a live region.
  onInvalid?: (message: string) => void
}

const errorId = 'new-task-error'
const blankMessage = 'Enter a task title'

export default function AddTaskForm({
  onAdd,
  inputRef,
  onInvalid,
}: AddTaskFormProps) {
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [error, setError] = useState('')
  const fallbackRef = useRef<HTMLInputElement>(null)
  const ref = inputRef ?? fallbackRef

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) {
      setError(blankMessage)
      ref.current?.focus()
      onInvalid?.(blankMessage)
      return
    }
    setError('')
    if (dueDate) onAdd(trimmed, dueDate)
    else onAdd(trimmed)
    setTitle('')
    setDueDate('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <label
        htmlFor="new-task"
        className="text-sm font-medium text-slate-700 dark:text-slate-300"
      >
        New task
      </label>
      <div className="flex gap-2">
        <input
          ref={ref}
          id="new-task"
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            if (error) setError('')
          }}
          placeholder="What needs doing?"
          aria-invalid={error ? 'true' : undefined}
          className={`min-w-0 flex-1 rounded-md border border-slate-500 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-500 aria-invalid:border-red-600 dark:border-slate-400 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-400 dark:aria-invalid:border-red-400 ${focusRing}`}
        />
        <button
          type="submit"
          className={`shrink-0 rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 ${focusRing}`}
        >
          Add
        </button>
      </div>
      {error && (
        <p id={errorId} className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <label
          htmlFor="new-task-due"
          className="text-sm text-slate-700 dark:text-slate-300"
        >
          Due date (optional)
        </label>
        <input
          id="new-task-due"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className={`rounded-md border border-slate-500 bg-white px-3 py-1.5 text-sm text-slate-900 dark:border-slate-400 dark:bg-slate-900 dark:text-slate-100 ${focusRing}`}
        />
      </div>
    </form>
  )
}
