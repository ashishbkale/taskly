import type { Task } from './types'

export type TaskSummary = {
  total: number
  completed: number
  remaining: number
  // Whole-number percentage of tasks completed; 0 when there are no tasks.
  percent: number
}

export function getTaskSummary(tasks: readonly Task[]): TaskSummary {
  const total = tasks.length
  const completed = tasks.filter((t) => t.done).length
  return {
    total,
    completed,
    remaining: total - completed,
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
  }
}
