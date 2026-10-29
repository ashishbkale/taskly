import type { Task } from './types'
import {
  DUE_FILTERS,
  DUE_FILTER_ORDER,
  describeDueDate,
  getToday,
  isOverdue,
  toDateKey,
} from './dueDate'

// Wednesday 28 Oct 2026, local time. Its week ends Sunday 1 Nov.
const wednesday = new Date(2026, 9, 28, 15, 30)
const today = getToday(wednesday)

function task(dueDate?: string, done = false): Task {
  return { id: dueDate ?? 'none', title: 'T', done, dueDate }
}

describe('toDateKey', () => {
  it('formats a local date as zero-padded YYYY-MM-DD', () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(toDateKey(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31')
  })
})

describe('getToday', () => {
  it('returns today and the coming Sunday', () => {
    expect(today).toEqual({ key: '2026-10-28', endOfWeekKey: '2026-11-01' })
  })

  it('ends the week on the same day when today is Sunday', () => {
    expect(getToday(new Date(2026, 10, 1))).toEqual({
      key: '2026-11-01',
      endOfWeekKey: '2026-11-01',
    })
  })

  it('runs Monday through Sunday', () => {
    expect(getToday(new Date(2026, 9, 26)).endOfWeekKey).toBe('2026-11-01')
  })

  it('crosses a year boundary', () => {
    // Wednesday 30 Dec 2026.
    expect(getToday(new Date(2026, 11, 30)).endOfWeekKey).toBe('2027-01-03')
  })
})

describe('isOverdue', () => {
  it('is true only for unfinished tasks due before today', () => {
    expect(isOverdue(task('2026-10-27'), today)).toBe(true)
    expect(isOverdue(task('2026-10-28'), today)).toBe(false)
    expect(isOverdue(task('2026-10-29'), today)).toBe(false)
    expect(isOverdue(task(), today)).toBe(false)
  })

  it('is false for completed tasks, however late', () => {
    expect(isOverdue(task('2020-01-01', true), today)).toBe(false)
  })
})

describe('DUE_FILTERS', () => {
  const sample = [
    task('2026-10-20'), // overdue
    task('2026-10-27', true), // past but done
    task('2026-10-28'), // today
    task('2026-11-01'), // Sunday, last day of the week
    task('2026-11-02'), // next Monday
    task(), // no due date
  ]

  function matching(filter: keyof typeof DUE_FILTERS) {
    return sample
      .filter((t) => DUE_FILTERS[filter].matches(t, today))
      .map((t) => t.dueDate ?? 'none')
  }

  it('lists the five filters in order', () => {
    expect(DUE_FILTER_ORDER.map((f) => DUE_FILTERS[f].label)).toEqual([
      'All',
      'Overdue',
      'Due today',
      'Due this week',
      'No due date',
    ])
  })

  it('"all" matches every task', () => {
    expect(matching('all')).toHaveLength(sample.length)
  })

  it('"overdue" excludes completed and current tasks', () => {
    expect(matching('overdue')).toEqual(['2026-10-20'])
  })

  it('"today" matches only today, done or not', () => {
    expect(matching('today')).toEqual(['2026-10-28'])
    expect(DUE_FILTERS.today.matches(task('2026-10-28', true), today)).toBe(true)
  })

  it('"week" runs from today through Sunday, excluding past days', () => {
    expect(matching('week')).toEqual(['2026-10-28', '2026-11-01'])
  })

  it('"none" matches tasks without a due date', () => {
    expect(matching('none')).toEqual(['none'])
  })
})

describe('describeDueDate', () => {
  it('returns null without a due date', () => {
    expect(describeDueDate(task(), today)).toBeNull()
  })

  it('says "Due today" for today', () => {
    expect(describeDueDate(task('2026-10-28'), today)).toBe('Due today')
  })

  it('prefixes overdue dates and omits the current year', () => {
    expect(describeDueDate(task('2026-10-27'), today)).toMatch(/^Overdue · /)
    expect(describeDueDate(task('2026-10-27'), today)).not.toContain('2026')
  })

  it('does not call a completed past task overdue', () => {
    expect(describeDueDate(task('2026-10-27', true), today)).toMatch(/^Due /)
  })

  it('includes the year for dates in another year', () => {
    expect(describeDueDate(task('2027-01-03'), today)).toContain('2027')
  })
})
