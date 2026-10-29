import { useState } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Task } from '../types'
import TaskList from './TaskList'

const tasks: Task[] = [
  { id: 'a', title: 'Buy milk', done: false },
  { id: 'b', title: 'Walk the dog', done: true },
  { id: 'c', title: 'Write tests', done: false },
]

const emptyMessage = 'No tasks yet.'

type User = ReturnType<typeof userEvent.setup>

function deleteButton(title: string) {
  return screen.getByRole('button', { name: `Delete "${title}"` })
}

function dialogButton(name: 'Cancel' | 'Delete') {
  return within(screen.getByRole('dialog')).getByRole('button', { name })
}

// Opens the confirm dialog for a task and confirms the delete.
async function confirmDelete(user: User, title: string) {
  await user.click(deleteButton(title))
  await user.click(dialogButton('Delete'))
}

type StatefulListProps = {
  initialTasks: Task[]
  onEmptied?: () => void
}

// Owns the task state like App does, so a delete actually shrinks the list.
function StatefulList({ initialTasks, onEmptied }: StatefulListProps) {
  const [items, setItems] = useState(initialTasks)
  return (
    <TaskList
      tasks={items}
      emptyMessage={emptyMessage}
      onToggle={() => {}}
      onDelete={(id) => setItems((prev) => prev.filter((t) => t.id !== id))}
      onEmptied={onEmptied}
    />
  )
}

describe('TaskList', () => {
  it('shows the empty-state message when there are no tasks', () => {
    render(
      <TaskList
        tasks={[]}
        emptyMessage={emptyMessage}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
      />,
    )
    expect(screen.getByText(emptyMessage)).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it.each(['No active tasks.', 'No completed tasks.'])(
    'renders the custom empty message %j',
    (message) => {
      render(
        <TaskList
          tasks={[]}
          emptyMessage={message}
          onToggle={vi.fn()}
          onDelete={vi.fn()}
        />,
      )
      expect(screen.getByText(message)).toBeInTheDocument()
      expect(screen.queryByText(emptyMessage)).not.toBeInTheDocument()
    },
  )

  it('renders one item per task in a list labelled "Tasks"', () => {
    render(
      <TaskList
        tasks={tasks}
        emptyMessage={emptyMessage}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
      />,
    )
    const list = screen.getByRole('list', { name: 'Tasks' })
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(items[0]).toHaveTextContent('Buy milk')
    expect(items[1]).toHaveTextContent('Walk the dog')
    expect(items[2]).toHaveTextContent('Write tests')
    expect(screen.queryByText(emptyMessage)).not.toBeInTheDocument()
  })

  it('renders done tasks checked and active tasks unchecked', () => {
    render(
      <TaskList
        tasks={tasks}
        emptyMessage={emptyMessage}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
      />,
    )
    expect(screen.getByRole('checkbox', { name: 'Buy milk' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Walk the dog' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Write tests' })).not.toBeChecked()
  })

  it('calls onToggle with the task id when its checkbox is clicked', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    render(
      <TaskList
        tasks={tasks}
        emptyMessage={emptyMessage}
        onToggle={onToggle}
        onDelete={vi.fn()}
      />,
    )
    await user.click(screen.getByRole('checkbox', { name: 'Walk the dog' }))
    expect(onToggle).toHaveBeenCalledTimes(1)
    expect(onToggle).toHaveBeenCalledWith('b')
  })

  it('calls onDelete with the right id when one of several tasks is deleted', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    render(
      <TaskList
        tasks={tasks}
        emptyMessage={emptyMessage}
        onToggle={vi.fn()}
        onDelete={onDelete}
      />,
    )
    await confirmDelete(user, 'Write tests')
    expect(onDelete).toHaveBeenCalledTimes(1)
    expect(onDelete).toHaveBeenCalledWith('c')
  })

  describe('focus after delete', () => {
    it('focuses the next task checkbox when a middle task is deleted', async () => {
      const user = userEvent.setup()
      render(<StatefulList initialTasks={tasks} />)
      await confirmDelete(user, 'Walk the dog')
      expect(
        screen.queryByRole('checkbox', { name: 'Walk the dog' }),
      ).not.toBeInTheDocument()
      expect(screen.getByRole('checkbox', { name: 'Write tests' })).toHaveFocus()
    })

    it('focuses the next task checkbox when the first task is deleted', async () => {
      const user = userEvent.setup()
      render(<StatefulList initialTasks={tasks} />)
      await confirmDelete(user, 'Buy milk')
      expect(screen.getByRole('checkbox', { name: 'Walk the dog' })).toHaveFocus()
    })

    it('focuses the previous task checkbox when the last task is deleted', async () => {
      const user = userEvent.setup()
      render(<StatefulList initialTasks={tasks} />)
      await confirmDelete(user, 'Write tests')
      expect(screen.getByRole('checkbox', { name: 'Walk the dog' })).toHaveFocus()
    })

    it('returns focus to the Delete button of a task that onDelete does not remove', async () => {
      const user = userEvent.setup()
      const onDelete = vi.fn()
      const onEmptied = vi.fn()
      const { rerender } = render(
        <TaskList
          tasks={tasks}
          emptyMessage={emptyMessage}
          onToggle={vi.fn()}
          onDelete={onDelete}
          onEmptied={onEmptied}
        />,
      )
      await confirmDelete(user, 'Buy milk')
      expect(onDelete).toHaveBeenCalledTimes(1)
      expect(onDelete).toHaveBeenCalledWith('a')
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(screen.getByRole('checkbox', { name: 'Buy milk' })).toBeInTheDocument()
      expect(deleteButton('Buy milk')).toHaveFocus()

      // Move focus on, then rerender with an unrelated change and a new
      // onEmptied: the close request was already handled, so focus stays put.
      await user.tab()
      expect(screen.getByRole('checkbox', { name: 'Walk the dog' })).toHaveFocus()
      const laterOnEmptied = vi.fn()
      rerender(
        <TaskList
          tasks={[...tasks, { id: 'd', title: 'Feed the cat', done: false }]}
          emptyMessage={emptyMessage}
          onToggle={vi.fn()}
          onDelete={onDelete}
          onEmptied={laterOnEmptied}
        />,
      )
      expect(screen.getByRole('checkbox', { name: 'Feed the cat' })).toBeInTheDocument()
      expect(screen.getByRole('checkbox', { name: 'Walk the dog' })).toHaveFocus()
      expect(onEmptied).not.toHaveBeenCalled()
      expect(laterOnEmptied).not.toHaveBeenCalled()
    })

    it('calls onEmptied when the only task is deleted', async () => {
      const user = userEvent.setup()
      const onEmptied = vi.fn()
      render(<StatefulList initialTasks={[tasks[0]]} onEmptied={onEmptied} />)
      await confirmDelete(user, 'Buy milk')
      expect(onEmptied).toHaveBeenCalledTimes(1)
      expect(screen.getByText(emptyMessage)).toBeInTheDocument()
      expect(screen.queryByRole('list')).not.toBeInTheDocument()
    })

    it('does not call onEmptied when tasks remain after a delete', async () => {
      const user = userEvent.setup()
      const onEmptied = vi.fn()
      render(<StatefulList initialTasks={tasks} onEmptied={onEmptied} />)
      await confirmDelete(user, 'Buy milk')
      expect(onEmptied).not.toHaveBeenCalled()
    })
  })

  describe('confirm-delete dialog', () => {
    afterEach(() => {
      document.body.removeAttribute('style')
    })

    function renderList(onDelete = vi.fn()) {
      const utils = render(
        <TaskList
          tasks={tasks}
          emptyMessage={emptyMessage}
          onToggle={vi.fn()}
          onDelete={onDelete}
        />,
      )
      return { ...utils, onDelete }
    }

    it('marks each Delete button as opening a dialog', () => {
      renderList()
      for (const task of tasks) {
        expect(deleteButton(task.title)).toHaveAttribute('aria-haspopup', 'dialog')
      }
    })

    it('opens a dialog naming the task instead of deleting right away', async () => {
      const user = userEvent.setup()
      const { onDelete } = renderList()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

      await user.click(deleteButton('Walk the dog'))

      const dialog = screen.getByRole('dialog', { name: 'Delete task?' })
      expect(dialog).toHaveAccessibleDescription(
        '"Walk the dog" will be permanently deleted.',
      )
      expect(dialogButton('Cancel')).toHaveFocus()
      expect(dialogButton('Delete')).toBeInTheDocument()
      expect(onDelete).not.toHaveBeenCalled()
      // The list is behind the modal, so role queries no longer find it.
      expect(screen.queryByRole('list', { name: 'Tasks' })).not.toBeInTheDocument()
      expect(document.body.style.overflow).toBe('hidden')
    })

    it.each([
      ['the Cancel button', async (user: User) => user.click(dialogButton('Cancel'))],
      ['Escape', async (user: User) => user.keyboard('{Escape}')],
      [
        'a backdrop click',
        async (user: User) => {
          const backdrop = screen.getByRole('dialog').parentElement?.parentElement
          if (!backdrop) throw new Error('backdrop not found')
          await user.click(backdrop)
        },
      ],
    ])(
      'cancels with %s: nothing is deleted and focus returns to that Delete button',
      async (_how, cancel) => {
        const user = userEvent.setup()
        const { onDelete } = renderList()

        await user.click(deleteButton('Walk the dog'))
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        await cancel(user)

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        expect(onDelete).not.toHaveBeenCalled()
        expect(deleteButton('Walk the dog')).toHaveFocus()
        expect(deleteButton('Buy milk')).not.toHaveFocus()
        expect(deleteButton('Write tests')).not.toHaveFocus()
        expect(screen.getAllByRole('checkbox')).toHaveLength(3)
        expect(document.body.style.overflow).toBe('')
      },
    )

    it('calls onDelete once with the task id when the delete is confirmed', async () => {
      const user = userEvent.setup()
      const { onDelete } = renderList()
      await user.click(deleteButton('Walk the dog'))
      await user.click(dialogButton('Delete'))
      expect(onDelete).toHaveBeenCalledTimes(1)
      expect(onDelete).toHaveBeenCalledWith('b')
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('does not open a second dialog while one is open', async () => {
      const user = userEvent.setup()
      const { onDelete } = renderList()
      await user.click(deleteButton('Walk the dog'))

      // The background is aria-hidden (and inert in real browsers), so the
      // button is only reachable with hidden: true and a raw click.
      const other = screen.getByRole('button', {
        name: 'Delete "Write tests"',
        hidden: true,
      })
      fireEvent.click(other)

      expect(screen.getAllByRole('dialog')).toHaveLength(1)
      expect(screen.getByRole('dialog')).toHaveAccessibleDescription(
        '"Walk the dog" will be permanently deleted.',
      )
      await user.click(dialogButton('Delete'))
      expect(onDelete).toHaveBeenCalledTimes(1)
      expect(onDelete).toHaveBeenCalledWith('b')
    })

    describe('when the task vanishes while the dialog is open', () => {
      function list(items: Task[], onDelete = vi.fn()) {
        return (
          <TaskList
            tasks={items}
            emptyMessage={emptyMessage}
            onToggle={vi.fn()}
            onDelete={onDelete}
          />
        )
      }

      it('closes the dialog and focuses the first remaining checkbox', async () => {
        const user = userEvent.setup()
        const onDelete = vi.fn()
        const { rerender } = render(list(tasks, onDelete))
        await user.click(deleteButton('Walk the dog'))

        rerender(list([tasks[0], tasks[2]], onDelete))

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        expect(screen.getByRole('checkbox', { name: 'Buy milk' })).toHaveFocus()
        expect(onDelete).not.toHaveBeenCalled()
        expect(document.body.style.overflow).toBe('')
      })

      it('focuses the empty message when no tasks are left', async () => {
        const user = userEvent.setup()
        const { rerender } = render(list(tasks))
        await user.click(deleteButton('Walk the dog'))

        rerender(list([]))

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        expect(screen.getByText(emptyMessage)).toHaveFocus()
      })

      it('does not reopen the dialog when the task comes back', async () => {
        const user = userEvent.setup()
        const onDelete = vi.fn()
        const { rerender } = render(list(tasks, onDelete))
        await user.click(deleteButton('Walk the dog'))

        rerender(list([tasks[0], tasks[2]], onDelete))
        rerender(list(tasks, onDelete))

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        expect(screen.getByRole('checkbox', { name: 'Walk the dog' })).toBeInTheDocument()
        expect(screen.getByRole('checkbox', { name: 'Buy milk' })).toHaveFocus()
        expect(onDelete).not.toHaveBeenCalled()

        // A fresh Delete click still works normally.
        await confirmDelete(user, 'Walk the dog')
        expect(onDelete).toHaveBeenCalledWith('b')
      })
    })
  })

  describe('due dates', () => {
    const today = { key: '2026-10-28', endOfWeekKey: '2026-11-01' }
    const dated: Task[] = [
      { id: 'o', title: 'Late', done: false, dueDate: '2026-10-20' },
      { id: 't', title: 'Now', done: false, dueDate: '2026-10-28' },
      { id: 'f', title: 'Later', done: false, dueDate: '2026-11-05' },
      { id: 'd', title: 'Late but done', done: true, dueDate: '2026-10-20' },
      { id: 'n', title: 'Someday', done: false },
    ]

    function renderDated() {
      render(
        <TaskList
          tasks={dated}
          today={today}
          emptyMessage={emptyMessage}
          onToggle={vi.fn()}
          onDelete={vi.fn()}
        />,
      )
    }

    it('describes each checkbox with its due date, keeping the title as its name', () => {
      renderDated()
      expect(
        screen.getByRole('checkbox', { name: 'Now' }),
      ).toHaveAccessibleDescription('Due today')
      expect(
        screen.getByRole('checkbox', { name: 'Late' }),
      ).toHaveAccessibleDescription(/^Overdue · /)
      expect(
        screen.getByRole('checkbox', { name: 'Later' }),
      ).toHaveAccessibleDescription(/^Due /)
    })

    it('does not mark a completed past task as overdue', () => {
      renderDated()
      expect(
        screen.getByRole('checkbox', { name: 'Late but done' }),
      ).toHaveAccessibleDescription(/^Due /)
    })

    it('shows no due text and no description for undated tasks', () => {
      renderDated()
      const box = screen.getByRole('checkbox', { name: 'Someday' })
      expect(box).not.toHaveAttribute('aria-describedby')
      expect(box.closest('li')).not.toHaveTextContent(/Due|Overdue/)
    })
  })
})
