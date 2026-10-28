import {
  useEffect,
  useId,
  useRef,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { focusRing, focusRingDanger } from '../styles'

type ConfirmDialogProps = {
  open: boolean
  title: string
  // Rendered inside a <p>, so keep it to inline content.
  message: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  // Called for the Cancel button, Escape and a backdrop click. The caller is
  // responsible for returning focus once the dialog has closed.
  onCancel: () => void
}

// Where a primary press on the dialog layer started and ended, relative to
// the panel.
type BackdropPress = {
  pointerId: number
  startedOutside: boolean
  endedOutside: boolean
}

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function getFocusable(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE))
}

type SavedState = { wasInert: boolean; ariaHidden: string | null }

// Makes every other child of <body> inert (no focus, no pointer, hidden from
// screen readers) and aria-hidden as a fallback, including children added
// later (e.g. a toast portal). Returns a function that stops watching and puts
// back each element's state from when it was first isolated.
function isolate(keep: HTMLElement) {
  const changed = new Map<HTMLElement, SavedState>()

  function hide(node: Node) {
    if (!(node instanceof HTMLElement) || node === keep) return
    // Already handled (e.g. removed and re-added): keep the first saved state.
    if (changed.has(node)) return
    changed.set(node, {
      wasInert: node.hasAttribute('inert'),
      ariaHidden: node.getAttribute('aria-hidden'),
    })
    node.setAttribute('inert', '')
    node.setAttribute('aria-hidden', 'true')
  }

  Array.from(document.body.children).forEach(hide)
  const observer = new MutationObserver((records) => {
    for (const record of records) record.addedNodes.forEach(hide)
  })
  observer.observe(document.body, { childList: true })

  return () => {
    // Pending records are dropped; those nodes were never changed.
    observer.disconnect()
    for (const [el, { wasInert, ariaHidden }] of changed) {
      if (!wasInert) el.removeAttribute('inert')
      if (ariaHidden === null) el.removeAttribute('aria-hidden')
      else el.setAttribute('aria-hidden', ariaHidden)
    }
    changed.clear()
  }
}

// Stops the page behind from scrolling. Pads the body by the scrollbar width
// so the layout doesn't shift when the scrollbar disappears.
function lockScroll() {
  const { body, documentElement } = document
  const previousOverflow = body.style.overflow
  const previousPaddingRight = body.style.paddingRight
  const scrollbarWidth = window.innerWidth - documentElement.clientWidth
  body.style.overflow = 'hidden'
  if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`
  return () => {
    body.style.overflow = previousOverflow
    body.style.paddingRight = previousPaddingRight
  }
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId()
  const messageId = useId()
  const backdropRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  // The primary-button press in progress on the dialog layer, if any.
  const press = useRef<BackdropPress | null>(null)
  const onCancelRef = useRef(onCancel)

  // Keep the latest onCancel for the document listeners below, so they don't
  // need re-attaching (and re-isolating the page) on every render.
  useEffect(() => {
    onCancelRef.current = onCancel
  })

  useEffect(() => {
    if (!open) return
    const backdrop = backdropRef.current
    const panelEl = panelRef.current
    if (!backdrop || !panelEl) return
    // Explicitly non-null so the hoisted handlers below don't need narrowing.
    const panel: HTMLDivElement = panelEl

    // Focus the safe choice first, then isolate the page behind.
    cancelRef.current?.focus()
    const restoreBackground = isolate(backdrop)
    const unlockScroll = lockScroll()

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancelRef.current()
        return
      }
      if (e.key !== 'Tab') return
      // Move focus ourselves so Tab never depends on the page's tab order.
      e.preventDefault()
      const items = getFocusable(panel)
      if (items.length === 0) {
        panel.focus()
        return
      }
      const index = items.findIndex((el) => el === document.activeElement)
      const last = items.length - 1
      let next: number
      if (index === -1) next = e.shiftKey ? last : 0
      else if (e.shiftKey) next = index === 0 ? last : index - 1
      else next = index === last ? 0 : index + 1
      items[next].focus()
    }

    // Safety net: if focus lands outside the dialog anyway (e.g. a browser
    // without inert), pull it back to Cancel.
    function handleFocusIn(e: FocusEvent) {
      if (e.target instanceof Node && !panel.contains(e.target)) {
        cancelRef.current?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('focusin', handleFocusIn)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('focusin', handleFocusIn)
      unlockScroll()
      restoreBackground()
      press.current = null
    }
  }, [open])

  if (!open) return null

  function isInPanel(target: EventTarget) {
    return target instanceof Node && !!panelRef.current?.contains(target)
  }

  function isPrimaryPress(e: ReactPointerEvent) {
    return e.isPrimary && e.button === 0
  }

  function handlePointerDown(e: ReactPointerEvent) {
    if (!isPrimaryPress(e)) return
    // Touch and pen implicitly capture the pointer to the press target, which
    // would make pointerup report where the press started. Release it so
    // pointerup reports where it actually ended.
    const { target } = e
    if (
      target instanceof Element &&
      'hasPointerCapture' in target &&
      target.hasPointerCapture(e.pointerId)
    ) {
      target.releasePointerCapture(e.pointerId)
    }
    press.current = {
      pointerId: e.pointerId,
      startedOutside: !isInPanel(target),
      endedOutside: false,
    }
  }

  function handlePointerUp(e: ReactPointerEvent) {
    const current = press.current
    if (!current || current.pointerId !== e.pointerId || !isPrimaryPress(e)) {
      return
    }
    current.endedOutside = !isInPanel(e.target)
  }

  // Only a press that both started and ended outside the panel cancels. A
  // drag between the panel and the backdrop (either way) does not. A click
  // with no pointer press behind it (assistive tech, scripted) cancels if it
  // targets the backdrop.
  function handleClick(e: ReactMouseEvent) {
    const current = press.current
    press.current = null
    const outside = current
      ? current.startedOutside && current.endedOutside
      : !isInPanel(e.target)
    if (outside && !isInPanel(e.target)) onCancel()
  }

  return createPortal(
    <div
      ref={backdropRef}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        press.current = null
      }}
      onClick={handleClick}
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 transition-opacity duration-150 starting:opacity-0 motion-reduce:transition-none dark:bg-black/70"
    >
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={messageId}
          tabIndex={-1}
          className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-5 shadow-xl transition duration-150 starting:scale-95 starting:opacity-0 focus:outline-none motion-reduce:transition-none dark:border-slate-500 dark:bg-slate-900"
        >
          <h2
            id={titleId}
            className="text-lg font-semibold text-slate-900 dark:text-slate-100"
          >
            {title}
          </h2>
          <p
            id={messageId}
            className="mt-2 wrap-break-word text-slate-700 dark:text-slate-300"
          >
            {message}
          </p>
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <button
              ref={cancelRef}
              type="button"
              onClick={onCancel}
              className={`rounded-md border border-slate-500 bg-white px-4 py-2 font-medium text-slate-900 transition-colors hover:bg-slate-100 motion-reduce:transition-none dark:border-slate-400 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 ${focusRing}`}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={`rounded-md border border-red-700 bg-red-700 px-4 py-2 font-medium text-white transition-colors hover:border-red-800 hover:bg-red-800 motion-reduce:transition-none dark:border-red-400 dark:bg-red-400 dark:text-slate-950 dark:hover:border-red-300 dark:hover:bg-red-300 ${focusRingDanger}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
