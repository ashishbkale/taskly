// dueDate is a local calendar day, 'YYYY-MM-DD'; absent when the task has none.
export type Task = { id: string; title: string; done: boolean; dueDate?: string }

export type Filter = 'all' | 'active' | 'done'

export type DueFilter = 'all' | 'overdue' | 'today' | 'week' | 'none'
