import type { TaskSummary } from '../summary'
import { panel } from '../styles'

type TaskSummaryBarProps = {
  summary: TaskSummary
}

export default function TaskSummaryBar({ summary }: TaskSummaryBarProps) {
  const { total, completed, remaining, percent } = summary

  return (
    <section aria-label="Task summary" className={`${panel} px-4 py-3`}>
      {/* Not role="status": App's own status region announces actions. */}
      <div aria-live="polite" aria-atomic="true">
        {total === 0 ? (
          <p className="text-sm text-slate-700 dark:text-slate-300">
            No tasks yet
          </p>
        ) : (
          <>
            <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <SummaryItem label="Total" value={total} />
              <SummaryItem label="Completed" value={completed} />
              <SummaryItem label="Remaining" value={remaining} />
            </dl>
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
              {completed} of {total} done – {percent}%
            </p>
          </>
        )}
      </div>
      {total > 0 && (
        <progress
          value={completed}
          max={total}
          aria-label="Tasks completed"
          aria-valuetext={`${percent}% complete`}
          className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200 accent-indigo-600 dark:bg-slate-800 dark:accent-indigo-400 [&::-moz-progress-bar]:bg-indigo-600 dark:[&::-moz-progress-bar]:bg-indigo-400 [&::-webkit-progress-bar]:bg-slate-200 dark:[&::-webkit-progress-bar]:bg-slate-800 [&::-webkit-progress-value]:bg-indigo-600 dark:[&::-webkit-progress-value]:bg-indigo-400"
        />
      )}
    </section>
  )
}

function SummaryItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex gap-1.5">
      <dt className="text-slate-700 dark:text-slate-300">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  )
}
