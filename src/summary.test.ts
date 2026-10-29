import type { Task } from './types'
import { getTaskSummary } from './summary'

function tasks(...done: boolean[]): Task[] {
  return done.map((d, i) => ({ id: String(i), title: `T${i}`, done: d }))
}

describe('getTaskSummary', () => {
  it('returns zeros for an empty list without dividing by zero', () => {
    expect(getTaskSummary([])).toEqual({
      total: 0,
      completed: 0,
      remaining: 0,
      percent: 0,
    })
  })

  it('reports 100% when every task is done', () => {
    expect(getTaskSummary(tasks(true, true, true))).toEqual({
      total: 3,
      completed: 3,
      remaining: 0,
      percent: 100,
    })
  })

  it('reports 0% when no task is done', () => {
    expect(getTaskSummary(tasks(false, false))).toEqual({
      total: 2,
      completed: 0,
      remaining: 2,
      percent: 0,
    })
  })

  it('counts a mixed list', () => {
    expect(getTaskSummary(tasks(true, false, true, false, true))).toEqual({
      total: 5,
      completed: 3,
      remaining: 2,
      percent: 60,
    })
  })

  it('rounds the percentage to a whole number', () => {
    expect(getTaskSummary(tasks(true, false, false)).percent).toBe(33)
    expect(getTaskSummary(tasks(true, true, false)).percent).toBe(67)
  })
})
