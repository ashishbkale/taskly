import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AddTaskForm from './AddTaskForm'

function setup() {
  const onAdd = vi.fn()
  const onInvalid = vi.fn()
  const user = userEvent.setup()
  render(<AddTaskForm onAdd={onAdd} onInvalid={onInvalid} />)
  const input = screen.getByLabelText('New task')
  const button = screen.getByRole('button', { name: 'Add' })
  return { onAdd, onInvalid, user, input, button }
}

describe('AddTaskForm', () => {
  it('exposes the input by its label "New task"', () => {
    render(<AddTaskForm onAdd={vi.fn()} />)
    expect(screen.getByRole('textbox', { name: 'New task' })).toBeInTheDocument()
  })

  it('calls onAdd with the trimmed title when the Add button is clicked', async () => {
    const { onAdd, user, input, button } = setup()
    await user.type(input, '  Buy milk  ')
    await user.click(button)
    expect(onAdd).toHaveBeenCalledTimes(1)
    expect(onAdd).toHaveBeenCalledWith('Buy milk')
  })

  it('calls onAdd with the trimmed title when Enter is pressed', async () => {
    const { onAdd, user, input } = setup()
    await user.type(input, '  Walk the dog {Enter}')
    expect(onAdd).toHaveBeenCalledTimes(1)
    expect(onAdd).toHaveBeenCalledWith('Walk the dog')
  })

  it('clears the input after adding', async () => {
    const { user, input, button } = setup()
    await user.type(input, 'Buy milk')
    await user.click(button)
    expect(input).toHaveValue('')
  })

  it('does not call onAdd for empty input', async () => {
    const { onAdd, user, input, button } = setup()
    await user.click(button)
    await user.type(input, '{Enter}')
    expect(onAdd).not.toHaveBeenCalled()
  })

  it('does not call onAdd for whitespace-only input', async () => {
    const { onAdd, user, input, button } = setup()
    await user.type(input, '    ')
    await user.click(button)
    await user.type(input, '{Enter}')
    expect(onAdd).not.toHaveBeenCalled()
  })

  describe('blank submit error', () => {
    it('shows visible "Enter a task title" text and marks the input invalid', async () => {
      const { user, input, button } = setup()
      expect(screen.queryByText('Enter a task title')).not.toBeInTheDocument()
      expect(input).not.toHaveAttribute('aria-invalid')

      await user.click(button)

      const error = screen.getByText('Enter a task title')
      expect(error).toBeVisible()
      expect(error).toHaveAttribute('id', 'new-task-error')
      expect(input).toHaveAttribute('aria-invalid', 'true')
      // Announced once by the parent via onInvalid, not by the form itself.
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(input).not.toHaveAttribute('aria-describedby')
    })

    it('returns focus to the input after clicking Add with a blank title', async () => {
      const { user, input, button } = setup()
      await user.click(button)
      expect(input).toHaveFocus()
    })

    it('keeps focus in the input when Enter is pressed on a blank title', async () => {
      const { user, input } = setup()
      await user.type(input, '{Enter}')
      expect(screen.getByText('Enter a task title')).toBeInTheDocument()
      expect(input).toHaveAttribute('aria-invalid', 'true')
      expect(input).toHaveFocus()
    })

    it('shows the error for a whitespace-only title too', async () => {
      const { onAdd, user, input, button } = setup()
      await user.type(input, '   ')
      await user.click(button)
      expect(screen.getByText('Enter a task title')).toBeInTheDocument()
      expect(input).toHaveAttribute('aria-invalid', 'true')
      expect(input).toHaveFocus()
      expect(onAdd).not.toHaveBeenCalled()
    })

    it('focuses the input passed via inputRef', async () => {
      const user = userEvent.setup()
      const inputRef = createRef<HTMLInputElement>()
      render(<AddTaskForm onAdd={vi.fn()} inputRef={inputRef} />)
      await user.click(screen.getByRole('button', { name: 'Add' }))
      expect(screen.getByLabelText('New task')).toHaveFocus()
    })

    it('clears the error as soon as the user types', async () => {
      const { user, input, button } = setup()
      await user.click(button)
      expect(screen.getByText('Enter a task title')).toBeInTheDocument()

      await user.type(input, 'B')
      expect(screen.queryByText('Enter a task title')).not.toBeInTheDocument()
      expect(input).not.toHaveAttribute('aria-invalid')
      expect(input).not.toHaveAttribute('aria-describedby')
    })

    it('stays cleared after a successful add', async () => {
      const { onAdd, user, input, button } = setup()
      await user.click(button)
      await user.type(input, 'Buy milk')
      await user.click(button)

      expect(onAdd).toHaveBeenCalledWith('Buy milk')
      expect(screen.queryByText('Enter a task title')).not.toBeInTheDocument()
      expect(input).not.toHaveAttribute('aria-invalid')
    })
  })

  describe('onInvalid', () => {
    it('is called once with "Enter a task title" when Add is clicked on a blank title', async () => {
      const { onInvalid, user, button } = setup()
      await user.click(button)
      expect(onInvalid).toHaveBeenCalledTimes(1)
      expect(onInvalid).toHaveBeenCalledWith('Enter a task title')
    })

    it('is called once with "Enter a task title" when Enter is pressed on a blank title', async () => {
      const { onInvalid, user, input } = setup()
      await user.type(input, '{Enter}')
      expect(onInvalid).toHaveBeenCalledTimes(1)
      expect(onInvalid).toHaveBeenCalledWith('Enter a task title')
    })

    it('is called for a whitespace-only title, once per submit', async () => {
      const { onAdd, onInvalid, user, input, button } = setup()
      await user.type(input, '   ')
      await user.click(button)
      expect(onInvalid).toHaveBeenCalledTimes(1)

      await user.type(input, '{Enter}')
      expect(onInvalid).toHaveBeenCalledTimes(2)
      expect(onInvalid).toHaveBeenNthCalledWith(2, 'Enter a task title')
      expect(onAdd).not.toHaveBeenCalled()
    })

    it('is not called on a valid submit', async () => {
      const { onAdd, onInvalid, user, input, button } = setup()
      await user.type(input, 'Buy milk{Enter}')
      await user.type(input, 'Walk the dog')
      await user.click(button)
      expect(onAdd).toHaveBeenCalledTimes(2)
      expect(onInvalid).not.toHaveBeenCalled()
    })

    it('is optional: a blank submit without it still shows the error', async () => {
      const user = userEvent.setup()
      render(<AddTaskForm onAdd={vi.fn()} />)
      await user.click(screen.getByRole('button', { name: 'Add' }))
      expect(screen.getByText('Enter a task title')).toBeInTheDocument()
    })
  })

  it('attaches inputRef to the "New task" input', async () => {
    const user = userEvent.setup()
    const inputRef = createRef<HTMLInputElement>()
    render(<AddTaskForm onAdd={vi.fn()} inputRef={inputRef} />)
    const input = screen.getByRole('textbox', { name: 'New task' })
    expect(inputRef.current).toBe(input)

    await user.type(input, 'Buy milk')
    expect(inputRef.current).toHaveValue('Buy milk')
    inputRef.current?.blur()
    expect(input).not.toHaveFocus()
    inputRef.current?.focus()
    expect(input).toHaveFocus()
  })

  describe('due date', () => {
    it('labels the optional date field', () => {
      render(<AddTaskForm onAdd={vi.fn()} />)
      expect(screen.getByLabelText('Due date (optional)')).toHaveAttribute(
        'type',
        'date',
      )
    })

    it('passes the chosen date to onAdd and clears both fields', async () => {
      const { onAdd, user, input, button } = setup()
      const due = screen.getByLabelText<HTMLInputElement>('Due date (optional)')
      await user.type(input, 'Pay rent')
      await user.type(due, '2026-10-30')
      await user.click(button)

      expect(onAdd).toHaveBeenCalledWith('Pay rent', '2026-10-30')
      expect(input).toHaveValue('')
      expect(due.value).toBe('')
    })

    it('calls onAdd with only the title when no date is set', async () => {
      const { onAdd, user, input } = setup()
      await user.type(input, 'Pay rent{Enter}')
      expect(onAdd.mock.calls).toEqual([['Pay rent']])
    })

    it('keeps the date when a blank title is rejected', async () => {
      const { onAdd, user, button } = setup()
      const due = screen.getByLabelText<HTMLInputElement>('Due date (optional)')
      await user.type(due, '2026-10-30')
      await user.click(button)

      expect(onAdd).not.toHaveBeenCalled()
      expect(due.value).toBe('2026-10-30')
    })
  })
})
