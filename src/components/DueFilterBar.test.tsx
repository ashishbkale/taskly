import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { DueFilter } from '../types'
import DueFilterBar from './DueFilterBar'

const labels: Record<DueFilter, string> = {
  all: 'All',
  overdue: 'Overdue',
  today: 'Due today',
  week: 'Due this week',
  none: 'No due date',
}

function group() {
  return screen.getByRole('group', { name: 'Filter by due date' })
}

describe('DueFilterBar', () => {
  it('renders the five options in a group named "Filter by due date"', () => {
    render(<DueFilterBar filter="all" onChange={vi.fn()} />)
    expect(
      within(group())
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(Object.values(labels))
  })

  it.each(Object.keys(labels) as DueFilter[])(
    'marks only the %j button as pressed',
    (filter) => {
      render(<DueFilterBar filter={filter} onChange={vi.fn()} />)
      for (const [value, label] of Object.entries(labels)) {
        expect(within(group()).getByRole('button', { name: label })).toHaveAttribute(
          'aria-pressed',
          value === filter ? 'true' : 'false',
        )
      }
    },
  )

  it('calls onChange with each value when its button is clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DueFilterBar filter="all" onChange={onChange} />)
    for (const label of Object.values(labels)) {
      await user.click(within(group()).getByRole('button', { name: label }))
    }
    expect(onChange.mock.calls).toEqual(
      Object.keys(labels).map((value) => [value]),
    )
  })

  it('uses real buttons that do not submit forms', () => {
    render(<DueFilterBar filter="all" onChange={vi.fn()} />)
    for (const button of within(group()).getAllByRole('button')) {
      expect(button).toHaveAttribute('type', 'button')
    }
  })
})
