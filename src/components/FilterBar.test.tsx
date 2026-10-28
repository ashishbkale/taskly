import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Filter } from '../types'
import FilterBar from './FilterBar'

const labels: Record<Filter, string> = {
  all: 'All',
  active: 'Active',
  done: 'Done',
}

describe('FilterBar', () => {
  it('renders All / Active / Done buttons in a group named "Filter tasks"', () => {
    render(<FilterBar filter="all" onChange={vi.fn()} />)
    const group = screen.getByRole('group', { name: 'Filter tasks' })
    const buttons = within(group).getAllByRole('button')
    expect(buttons.map((b) => b.textContent)).toEqual(['All', 'Active', 'Done'])
  })

  it.each<Filter>(['all', 'active', 'done'])(
    'marks only the %j button as pressed',
    (filter) => {
      render(<FilterBar filter={filter} onChange={vi.fn()} />)
      for (const [value, label] of Object.entries(labels)) {
        expect(screen.getByRole('button', { name: label })).toHaveAttribute(
          'aria-pressed',
          value === filter ? 'true' : 'false',
        )
      }
    },
  )

  it('updates the pressed state when the filter prop changes', () => {
    const { rerender } = render(<FilterBar filter="all" onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    rerender(<FilterBar filter="done" onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Done' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('calls onChange with "all", "active" and "done" when the buttons are clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<FilterBar filter="all" onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Active' }))
    await user.click(screen.getByRole('button', { name: 'Done' }))
    await user.click(screen.getByRole('button', { name: 'All' }))

    expect(onChange.mock.calls).toEqual([['active'], ['done'], ['all']])
  })

  it('does not change the pressed state by itself (controlled by the filter prop)', async () => {
    const user = userEvent.setup()
    render(<FilterBar filter="all" onChange={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.getByRole('button', { name: 'Done' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
})
