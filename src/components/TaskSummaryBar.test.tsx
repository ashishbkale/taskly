import { render, screen, within } from '@testing-library/react'
import { getTaskSummary } from '../summary'
import type { Task } from '../types'
import TaskSummaryBar from './TaskSummaryBar'

function tasks(...done: boolean[]): Task[] {
  return done.map((d, i) => ({ id: String(i), title: `T${i}`, done: d }))
}

function region() {
  return screen.getByRole('region', { name: 'Task summary' })
}

function count(label: string) {
  return within(region()).getByText(label).nextElementSibling?.textContent
}

describe('TaskSummaryBar', () => {
  it('shows total, completed and remaining counts with a progress line', () => {
    render(<TaskSummaryBar summary={getTaskSummary(tasks(true, true, true, false, false))} />)
    expect(count('Total')).toBe('5')
    expect(count('Completed')).toBe('3')
    expect(count('Remaining')).toBe('2')
    expect(within(region()).getByText('3 of 5 done – 60%')).toBeInTheDocument()
  })

  it('labels the progress indicator and exposes its value', () => {
    render(<TaskSummaryBar summary={getTaskSummary(tasks(true, false, false, false))} />)
    const progress = screen.getByRole('progressbar', { name: 'Tasks completed' })
    expect(progress).toHaveAttribute('value', '1')
    expect(progress).toHaveAttribute('max', '4')
    expect(progress).toHaveAttribute('aria-valuetext', '25% complete')
  })

  it('shows "No tasks yet" and no progress indicator when empty', () => {
    render(<TaskSummaryBar summary={getTaskSummary([])} />)
    expect(within(region()).getByText('No tasks yet')).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(region()).not.toHaveTextContent('%')
  })

  it('puts the counts in a polite live region', () => {
    render(<TaskSummaryBar summary={getTaskSummary(tasks(false))} />)
    const live = within(region()).getByText('0 of 1 done – 0%').closest('[aria-live]')
    expect(live).toHaveAttribute('aria-live', 'polite')
    expect(live).toHaveAttribute('aria-atomic', 'true')
  })
})
