import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

type User = ReturnType<typeof userEvent.setup>

async function addTasks(user: User, ...titles: string[]) {
  const input = screen.getByLabelText('New task')
  for (const title of titles) {
    await user.type(input, `${title}{Enter}`)
  }
}

function visibleTitles() {
  const list = screen.queryByRole('list', { name: 'Tasks' })
  if (!list) return []
  // Each checkbox is named by its task title.
  return within(list)
    .getAllByRole<HTMLInputElement>('checkbox')
    .map((box) => box.labels?.[0]?.textContent)
}

function filterButton(name: 'All' | 'Active' | 'Done') {
  return within(screen.getByRole('group', { name: 'Filter tasks' })).getByRole(
    'button',
    { name },
  )
}

function checkbox(name: string) {
  return screen.getByRole('checkbox', { name })
}

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

async function expectStatus(text: string) {
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(text))
}

describe('App', () => {
  afterEach(() => {
    // Header writes the theme to <html> and localStorage.
    localStorage.clear()
    document.documentElement.classList.remove('dark')
    // The confirm dialog locks body scrolling while open.
    document.body.removeAttribute('style')
  })

  it('adds, toggles and deletes tasks', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByText('No tasks yet.')).toBeInTheDocument()

    const input = screen.getByLabelText('New task')
    await user.type(input, 'Buy milk{Enter}')
    await user.type(input, 'Walk the dog')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    let items = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('Buy milk')
    expect(items[1]).toHaveTextContent('Walk the dog')

    const milk = checkbox('Buy milk')
    expect(milk).not.toBeChecked()
    await user.click(milk)
    expect(checkbox('Buy milk')).toBeChecked()
    expect(checkbox('Walk the dog')).not.toBeChecked()

    await confirmDelete(user, 'Walk the dog')

    items = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(items).toHaveLength(1)
    expect(items[0]).toHaveTextContent('Buy milk')
    expect(checkbox('Buy milk')).toBeChecked()
    expect(
      screen.queryByRole('checkbox', { name: 'Walk the dog' }),
    ).not.toBeInTheDocument()
  })

  it('shows the "all" empty message and an empty status region on start', () => {
    render(<App />)
    expect(screen.getByText('No tasks yet.')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Tasks' })).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  describe('announcements', () => {
    it('announces adds, completions, re-activations and deletes in the status region', async () => {
      const user = userEvent.setup()
      render(<App />)
      const status = screen.getByRole('status')

      await user.type(screen.getByLabelText('New task'), '  Buy milk  {Enter}')
      await expectStatus('Added "Buy milk"')

      await user.click(checkbox('Buy milk'))
      await expectStatus('Completed "Buy milk"')

      await user.click(checkbox('Buy milk'))
      await expectStatus('Marked "Buy milk" as active')

      await confirmDelete(user, 'Buy milk')
      await expectStatus('Deleted "Buy milk"')

      // Same node throughout: the live region must stay mounted to be announced.
      expect(screen.getByRole('status')).toBe(status)
    })

    it('announces a repeated identical message again (clears, then sets it)', async () => {
      const user = userEvent.setup()
      render(<App />)
      const status = screen.getByRole('status')

      await addTasks(user, 'Buy milk')
      await expectStatus('Added "Buy milk"')

      // Record every text the live region shows from here on.
      const seen: string[] = []
      const observer = new MutationObserver(() => {
        seen.push(status.textContent ?? '')
      })
      observer.observe(status, {
        childList: true,
        characterData: true,
        subtree: true,
      })

      await addTasks(user, 'Buy milk')
      await expectStatus('Added "Buy milk"')
      await waitFor(() => expect(seen).toContain('Added "Buy milk"'))
      observer.disconnect()

      const cleared = seen.indexOf('')
      expect(cleared).toBeGreaterThanOrEqual(0)
      expect(seen.indexOf('Added "Buy milk"', cleared)).toBeGreaterThan(cleared)
      expect(screen.getAllByRole('checkbox', { name: 'Buy milk' })).toHaveLength(2)
    })

    it('announces a blank submit once, through the status region only', async () => {
      const user = userEvent.setup()
      render(<App />)
      const input = screen.getByLabelText('New task')

      await user.click(screen.getByRole('button', { name: 'Add' }))
      await expectStatus('Enter a task title')

      // Visible error text is present but is not a second live region, and the
      // input isn't described by it, so screen readers hear it only once.
      expect(screen.getByText('Enter a task title', { selector: '#new-task-error' })).toBeVisible()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(document.querySelector('[role="alert"]')).toBeNull()
      expect(input).not.toHaveAttribute('aria-describedby')
      expect(input).toHaveAttribute('aria-invalid', 'true')
      expect(input).toHaveFocus()
      expect(screen.getByText('No tasks yet.')).toBeInTheDocument()
    })

    it('announces a second blank submit again (clears, then sets it)', async () => {
      const user = userEvent.setup()
      render(<App />)
      const status = screen.getByRole('status')
      const input = screen.getByLabelText('New task')

      await user.type(input, '{Enter}')
      await expectStatus('Enter a task title')

      const seen: string[] = []
      const observer = new MutationObserver(() => {
        seen.push(status.textContent ?? '')
      })
      observer.observe(status, {
        childList: true,
        characterData: true,
        subtree: true,
      })

      await user.type(input, '   {Enter}')
      await waitFor(() => expect(seen).toContain('Enter a task title'))
      observer.disconnect()

      const cleared = seen.indexOf('')
      expect(cleared).toBeGreaterThanOrEqual(0)
      expect(seen.indexOf('Enter a task title', cleared)).toBeGreaterThan(cleared)
      expect(status).toHaveTextContent('Enter a task title')
      expect(screen.getByRole('status')).toBe(status)
    })

    it('replaces the blank-submit announcement after a valid add', async () => {
      const user = userEvent.setup()
      render(<App />)
      const input = screen.getByLabelText('New task')

      await user.type(input, '{Enter}')
      await expectStatus('Enter a task title')
      await user.type(input, 'Buy milk{Enter}')
      await expectStatus('Added "Buy milk"')
      expect(screen.queryByText('Enter a task title')).not.toBeInTheDocument()
    })
  })

  describe('filters', () => {
    it('switches between All / Active / Done and shows the matching tasks', async () => {
      const user = userEvent.setup()
      render(<App />)
      await addTasks(user, 'Buy milk', 'Walk the dog', 'Write tests')
      await user.click(checkbox('Walk the dog'))

      expect(filterButton('All')).toHaveAttribute('aria-pressed', 'true')
      expect(visibleTitles()).toEqual(['Buy milk', 'Walk the dog', 'Write tests'])

      await user.click(filterButton('Active'))
      expect(filterButton('Active')).toHaveAttribute('aria-pressed', 'true')
      expect(filterButton('All')).toHaveAttribute('aria-pressed', 'false')
      expect(visibleTitles()).toEqual(['Buy milk', 'Write tests'])

      await user.click(filterButton('Done'))
      expect(filterButton('Done')).toHaveAttribute('aria-pressed', 'true')
      expect(visibleTitles()).toEqual(['Walk the dog'])
      expect(checkbox('Walk the dog')).toBeChecked()

      await user.click(filterButton('All'))
      expect(filterButton('All')).toHaveAttribute('aria-pressed', 'true')
      expect(visibleTitles()).toEqual(['Buy milk', 'Walk the dog', 'Write tests'])
    })

    it('shows "No tasks yet." under All when there are no tasks', async () => {
      const user = userEvent.setup()
      render(<App />)
      await user.click(filterButton('Active'))
      await user.click(filterButton('All'))
      expect(screen.getByText('No tasks yet.')).toBeInTheDocument()
      expect(screen.queryByRole('list', { name: 'Tasks' })).not.toBeInTheDocument()
    })

    it('shows "No active tasks." under Active when every task is done', async () => {
      const user = userEvent.setup()
      render(<App />)
      await addTasks(user, 'Buy milk')
      await user.click(checkbox('Buy milk'))
      await user.click(filterButton('Active'))
      expect(screen.getByText('No active tasks.')).toBeInTheDocument()
      expect(screen.queryByText('No tasks yet.')).not.toBeInTheDocument()
      expect(screen.queryByRole('list', { name: 'Tasks' })).not.toBeInTheDocument()
    })

    it('shows "No completed tasks." under Done when every task is active', async () => {
      const user = userEvent.setup()
      render(<App />)
      await addTasks(user, 'Buy milk')
      await user.click(filterButton('Done'))
      expect(screen.getByText('No completed tasks.')).toBeInTheDocument()
      expect(screen.queryByText('No tasks yet.')).not.toBeInTheDocument()
      expect(screen.queryByRole('list', { name: 'Tasks' })).not.toBeInTheDocument()
    })

    it('announces the filter and the number of tasks shown', async () => {
      const user = userEvent.setup()
      render(<App />)
      await addTasks(user, 'Buy milk', 'Walk the dog', 'Write tests')
      await user.click(checkbox('Walk the dog'))

      await user.click(filterButton('Active'))
      await expectStatus('Showing active tasks (2)')

      await user.click(filterButton('Done'))
      await expectStatus('Showing completed tasks (1)')

      await user.click(filterButton('All'))
      await expectStatus('Showing all tasks (3)')
    })

    it('announces a count of 0 for an empty filter', async () => {
      const user = userEvent.setup()
      render(<App />)
      await addTasks(user, 'Buy milk')
      await user.click(filterButton('Done'))
      await expectStatus('Showing completed tasks (0)')
    })
  })

  describe('focus after delete', () => {
    it('returns focus to the "New task" input after deleting the last task', async () => {
      const user = userEvent.setup()
      render(<App />)
      const input = screen.getByLabelText('New task')

      await user.type(input, 'Buy milk{Enter}')
      await user.click(checkbox('Buy milk'))
      expect(input).not.toHaveFocus()

      await confirmDelete(user, 'Buy milk')
      expect(input).toHaveFocus()
      expect(screen.getByText('No tasks yet.')).toBeInTheDocument()
    })

    it('focuses the previous task when the last of several is deleted', async () => {
      const user = userEvent.setup()
      render(<App />)
      const input = screen.getByLabelText('New task')

      await addTasks(user, 'Buy milk', 'Walk the dog')
      await confirmDelete(user, 'Walk the dog')

      expect(checkbox('Buy milk')).toHaveFocus()
      expect(input).not.toHaveFocus()
    })

    it('focuses the next task when a task that is not last is deleted', async () => {
      const user = userEvent.setup()
      render(<App />)
      await addTasks(user, 'Buy milk', 'Walk the dog', 'Write tests')
      await confirmDelete(user, 'Walk the dog')
      expect(checkbox('Write tests')).toHaveFocus()
    })
  })

  describe('focus after toggle', () => {
    it('keeps focus on the checkbox under All and announces the completion', async () => {
      const user = userEvent.setup()
      render(<App />)
      await addTasks(user, 'Buy milk', 'Walk the dog')

      await user.click(checkbox('Buy milk'))
      expect(checkbox('Buy milk')).toBeChecked()
      expect(checkbox('Buy milk')).toHaveFocus()
      await expectStatus('Completed "Buy milk"')
      expect(screen.getByRole('status')).not.toHaveTextContent('no longer shown')
    })

    it('under Active, moves focus to the next task, then the previous one', async () => {
      const user = userEvent.setup()
      render(<App />)
      await addTasks(user, 'Buy milk', 'Walk the dog', 'Write tests')
      await user.click(filterButton('Active'))

      await user.click(checkbox('Buy milk'))
      expect(
        screen.queryByRole('checkbox', { name: 'Buy milk' }),
      ).not.toBeInTheDocument()
      expect(checkbox('Walk the dog')).toHaveFocus()
      await expectStatus(`Completed "Buy milk". It's no longer shown in Active.`)

      // Last visible task: falls back to the previous one.
      await user.click(checkbox('Write tests'))
      expect(checkbox('Walk the dog')).toHaveFocus()
      await expectStatus(`Completed "Write tests". It's no longer shown in Active.`)
    })

    it('under Active, moves focus to the empty message when the only task is completed', async () => {
      const user = userEvent.setup()
      render(<App />)
      await addTasks(user, 'Buy milk')
      await user.click(filterButton('Active'))

      await user.click(checkbox('Buy milk'))
      const empty = screen.getByText('No active tasks.')
      expect(empty).toHaveAttribute('id', 'task-list-empty')
      expect(empty).toHaveAttribute('tabindex', '-1')
      expect(empty).toHaveFocus()
      await expectStatus(`Completed "Buy milk". It's no longer shown in Active.`)
    })

    it('under Done, moves focus to the next / previous task, then the empty message', async () => {
      const user = userEvent.setup()
      render(<App />)
      await addTasks(user, 'Buy milk', 'Walk the dog', 'Write tests')
      await user.click(checkbox('Buy milk'))
      await user.click(checkbox('Walk the dog'))
      await user.click(checkbox('Write tests'))
      await user.click(filterButton('Done'))

      await user.click(checkbox('Buy milk'))
      expect(checkbox('Walk the dog')).toHaveFocus()
      await expectStatus(`Marked "Buy milk" as active. It's no longer shown in Done.`)

      await user.click(checkbox('Write tests'))
      expect(checkbox('Walk the dog')).toHaveFocus()
      await expectStatus(`Marked "Write tests" as active. It's no longer shown in Done.`)

      await user.click(checkbox('Walk the dog'))
      const empty = screen.getByText('No completed tasks.')
      expect(empty).toHaveAttribute('id', 'task-list-empty')
      expect(empty).toHaveFocus()
      await expectStatus(`Marked "Walk the dog" as active. It's no longer shown in Done.`)

      await user.click(filterButton('All'))
      expect(checkbox('Buy milk')).not.toBeChecked()
      expect(checkbox('Walk the dog')).not.toBeChecked()
      expect(checkbox('Write tests')).not.toBeChecked()
    })
  })

  describe('confirm-delete dialog', () => {
    it('deletes after confirming, announces it and focuses the remaining task', async () => {
      const user = userEvent.setup()
      render(<App />)
      await addTasks(user, 'Buy milk', 'Walk the dog')

      await user.click(deleteButton('Buy milk'))
      expect(
        screen.getByRole('dialog', { name: 'Delete task?' }),
      ).toHaveAccessibleDescription('"Buy milk" will be permanently deleted.')
      // Not deleted yet.
      expect(screen.getByRole('checkbox', { name: 'Buy milk', hidden: true })).toBeInTheDocument()

      await user.click(dialogButton('Delete'))

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(visibleTitles()).toEqual(['Walk the dog'])
      expect(checkbox('Walk the dog')).toHaveFocus()
      await expectStatus('Deleted "Buy milk"')
      expect(checkbox('Walk the dog')).toHaveFocus()
    })

    it('keeps the task, announces nothing and refocuses its Delete button on cancel', async () => {
      const user = userEvent.setup()
      render(<App />)
      await addTasks(user, 'Buy milk', 'Walk the dog')
      await expectStatus('Added "Walk the dog"')

      await user.click(deleteButton('Buy milk'))
      await user.click(dialogButton('Cancel'))

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(visibleTitles()).toEqual(['Buy milk', 'Walk the dog'])
      expect(deleteButton('Buy milk')).toHaveFocus()
      // Give a would-be announcement time to arrive (it is set 100 ms later).
      await new Promise((resolve) => setTimeout(resolve, 200))
      expect(screen.getByRole('status')).not.toHaveTextContent('Deleted')
      expect(screen.getByRole('status')).toHaveTextContent('Added "Walk the dog"')
    })

    it('focuses the "New task" input and shows the empty message after confirming the only task', async () => {
      const user = userEvent.setup()
      render(<App />)
      const input = screen.getByLabelText('New task')
      await addTasks(user, 'Buy milk')

      await confirmDelete(user, 'Buy milk')

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(input).toHaveFocus()
      expect(screen.getByText('No tasks yet.')).toBeInTheDocument()
      expect(screen.queryByRole('list', { name: 'Tasks' })).not.toBeInTheDocument()
      await expectStatus('Deleted "Buy milk"')
    })

    it('after cancelling one delete, confirming another focuses the neighbour of that task', async () => {
      const user = userEvent.setup()
      render(<App />)
      const input = screen.getByLabelText('New task')
      await addTasks(user, 'Buy milk', 'Walk the dog', 'Write tests')

      await user.click(deleteButton('Buy milk'))
      await user.click(dialogButton('Cancel'))
      expect(deleteButton('Buy milk')).toHaveFocus()

      await confirmDelete(user, 'Write tests')
      expect(visibleTitles()).toEqual(['Buy milk', 'Walk the dog'])
      expect(checkbox('Walk the dog')).toHaveFocus()
      await expectStatus('Deleted "Write tests"')
      // The announcement's re-render doesn't move focus.
      expect(checkbox('Walk the dog')).toHaveFocus()
      expect(input).not.toHaveFocus()
    })

    it('under Active, Escape closes the dialog and keeps the task', async () => {
      const user = userEvent.setup()
      render(<App />)
      await addTasks(user, 'Buy milk', 'Walk the dog')
      await user.click(filterButton('Active'))

      await user.click(deleteButton('Walk the dog'))
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      await user.keyboard('{Escape}')

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(filterButton('Active')).toHaveAttribute('aria-pressed', 'true')
      expect(visibleTitles()).toEqual(['Buy milk', 'Walk the dog'])
      expect(deleteButton('Walk the dog')).toHaveFocus()
    })
  })
})
