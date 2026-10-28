import { StrictMode } from 'react'
import type { ComponentProps } from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ConfirmDialog from './ConfirmDialog'

type Overrides = Partial<ComponentProps<typeof ConfirmDialog>>

function dialogProps(overrides: Overrides = {}) {
  return {
    open: true,
    title: 'Delete task?',
    message: '"Buy milk" will be permanently deleted.',
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  }
}

function dialog() {
  return screen.getByRole('dialog')
}

function button(name: string) {
  return within(dialog()).getByRole('button', { name })
}

// The full-screen overlay the dialog panel sits in. A click on it (outside
// the panel) is a backdrop click.
function backdrop() {
  const el = dialog().parentElement?.parentElement
  if (!el) throw new Error('backdrop not found')
  return el
}

// jsdom implements PointerEvent, so fireEvent.pointer* carries isPrimary,
// button and pointerId without a polyfill.
const primary = { isPrimary: true, button: 0, pointerId: 1 }

// MutationObserver callbacks run as microtasks; a macrotask turn guarantees
// any pending record has been reported.
function flushObservers() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

describe('ConfirmDialog', () => {
  const extraNodes: HTMLElement[] = []

  function addBodyChild(attrs: Record<string, string> = {}) {
    const el = document.createElement('div')
    for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value)
    document.body.appendChild(el)
    extraNodes.push(el)
    return el
  }

  afterEach(() => {
    for (const el of extraNodes.splice(0)) el.remove()
    document.body.removeAttribute('style')
  })

  it('renders nothing when closed', () => {
    render(<ConfirmDialog {...dialogProps({ open: false })} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByText('Delete task?')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(document.body.style.overflow).toBe('')
  })

  it('is a modal dialog named by its title and described by its message', () => {
    render(<ConfirmDialog {...dialogProps()} />)
    const el = screen.getByRole('dialog', { name: 'Delete task?' })
    expect(el).toHaveAttribute('aria-modal', 'true')
    expect(el).toHaveAccessibleDescription(
      '"Buy milk" will be permanently deleted.',
    )
    expect(
      within(el).getByRole('heading', { name: 'Delete task?' }),
    ).toBeInTheDocument()
    expect(within(el).getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Cancel',
      'Delete',
    ])
  })

  it('is portalled to <body>, outside the render container', () => {
    const { container } = render(<ConfirmDialog {...dialogProps()} />)
    expect(container).not.toContainElement(dialog())
    expect(document.body).toContainElement(dialog())
  })

  it('focuses Cancel when it opens', () => {
    render(<ConfirmDialog {...dialogProps()} />)
    expect(button('Cancel')).toHaveFocus()
  })

  it('focuses Cancel when it changes from closed to open', () => {
    const props = dialogProps({ open: false })
    const { rerender } = render(<ConfirmDialog {...props} />)
    rerender(<ConfirmDialog {...props} open />)
    expect(button('Cancel')).toHaveFocus()
  })

  it('uses "Confirm" and "Cancel" when no labels are given', () => {
    const props = dialogProps()
    render(
      <ConfirmDialog
        open
        title={props.title}
        message={props.message}
        onConfirm={props.onConfirm}
        onCancel={props.onCancel}
      />,
    )
    expect(button('Cancel')).toBeInTheDocument()
    expect(button('Confirm')).toBeInTheDocument()
  })

  describe('focus trap', () => {
    it('wraps Tab from the last button to the first', async () => {
      const user = userEvent.setup()
      render(<ConfirmDialog {...dialogProps()} />)
      await user.tab()
      expect(button('Delete')).toHaveFocus()
      await user.tab()
      expect(button('Cancel')).toHaveFocus()
    })

    it('wraps Shift+Tab from the first button to the last', async () => {
      const user = userEvent.setup()
      render(<ConfirmDialog {...dialogProps()} />)
      expect(button('Cancel')).toHaveFocus()
      await user.tab({ shift: true })
      expect(button('Delete')).toHaveFocus()
      await user.tab({ shift: true })
      expect(button('Cancel')).toHaveFocus()
    })

    it('keeps Tab inside the dialog even with focusable content behind it', async () => {
      const user = userEvent.setup()
      render(
        <>
          <button type="button">Behind</button>
          <ConfirmDialog {...dialogProps()} />
        </>,
      )
      for (let i = 0; i < 4; i++) {
        await user.tab()
        expect(dialog()).toContainElement(document.activeElement as HTMLElement)
      }
    })
  })

  describe('closing and confirming', () => {
    it('calls onCancel when Escape is pressed', async () => {
      const user = userEvent.setup()
      const props = dialogProps()
      render(<ConfirmDialog {...props} />)
      await user.keyboard('{Escape}')
      expect(props.onCancel).toHaveBeenCalledTimes(1)
      expect(props.onConfirm).not.toHaveBeenCalled()
    })

    it('calls onCancel when the backdrop is clicked', async () => {
      const user = userEvent.setup()
      const props = dialogProps()
      render(<ConfirmDialog {...props} />)
      await user.click(backdrop())
      expect(props.onCancel).toHaveBeenCalledTimes(1)
      expect(props.onConfirm).not.toHaveBeenCalled()
    })

    it('does not call onCancel for clicks on the panel, title or message', async () => {
      const user = userEvent.setup()
      const props = dialogProps()
      render(<ConfirmDialog {...props} />)
      await user.click(dialog())
      await user.click(screen.getByRole('heading', { name: 'Delete task?' }))
      await user.click(screen.getByText('"Buy milk" will be permanently deleted.'))
      expect(props.onCancel).not.toHaveBeenCalled()
      expect(props.onConfirm).not.toHaveBeenCalled()
    })

    it('calls onCancel when Cancel is clicked', async () => {
      const user = userEvent.setup()
      const props = dialogProps()
      render(<ConfirmDialog {...props} />)
      await user.click(button('Cancel'))
      expect(props.onCancel).toHaveBeenCalledTimes(1)
      expect(props.onConfirm).not.toHaveBeenCalled()
    })

    it('calls onConfirm when the confirm button is clicked', async () => {
      const user = userEvent.setup()
      const props = dialogProps()
      render(<ConfirmDialog {...props} />)
      await user.click(button('Delete'))
      expect(props.onConfirm).toHaveBeenCalledTimes(1)
      expect(props.onCancel).not.toHaveBeenCalled()
    })

    it('stops responding to Escape once closed', async () => {
      const user = userEvent.setup()
      const props = dialogProps()
      const { rerender } = render(<ConfirmDialog {...props} />)
      rerender(<ConfirmDialog {...props} open={false} />)
      await user.keyboard('{Escape}')
      expect(props.onCancel).not.toHaveBeenCalled()
    })
  })

  describe('backdrop dismissal with pointer presses', () => {
    // A real browser targets the click at the common ancestor of where the
    // press started and ended, which is the backdrop in every case below.
    it('cancels when a primary press starts and ends on the backdrop', () => {
      const props = dialogProps()
      render(<ConfirmDialog {...props} />)
      fireEvent.pointerDown(backdrop(), primary)
      fireEvent.pointerUp(backdrop(), primary)
      fireEvent.click(backdrop())
      expect(props.onCancel).toHaveBeenCalledTimes(1)
      expect(props.onConfirm).not.toHaveBeenCalled()
    })

    it('does not cancel when a press starts on the backdrop and ends on the panel', () => {
      const props = dialogProps()
      render(<ConfirmDialog {...props} />)
      fireEvent.pointerDown(backdrop(), primary)
      fireEvent.pointerUp(
        screen.getByText('"Buy milk" will be permanently deleted.'),
        primary,
      )
      fireEvent.click(backdrop())
      expect(props.onCancel).not.toHaveBeenCalled()
      expect(dialog()).toBeInTheDocument()
    })

    it('does not cancel when a press starts on the panel and ends on the backdrop', () => {
      const props = dialogProps()
      render(<ConfirmDialog {...props} />)
      fireEvent.pointerDown(
        screen.getByRole('heading', { name: 'Delete task?' }),
        primary,
      )
      fireEvent.pointerUp(backdrop(), primary)
      fireEvent.click(backdrop())
      expect(props.onCancel).not.toHaveBeenCalled()
    })

    it.each([
      ['a secondary button', { isPrimary: true, button: 2, pointerId: 1 }],
      ['a non-primary pointer', { isPrimary: false, button: 0, pointerId: 2 }],
    ])(
      'does not record a press with %s, so a following backdrop click uses the plain-click rule',
      (_how, init) => {
        const props = dialogProps()
        render(<ConfirmDialog {...props} />)
        fireEvent.pointerDown(backdrop(), init)
        fireEvent.pointerUp(backdrop(), init)
        fireEvent.click(backdrop())
        // The ignored press leaves nothing recorded, so the click counts as a
        // click with no press behind it and, landing on the backdrop, cancels.
        expect(props.onCancel).toHaveBeenCalledTimes(1)
      },
    )

    it('does not let a non-primary press replace a primary press that started on the panel', () => {
      const props = dialogProps()
      render(<ConfirmDialog {...props} />)
      const nonPrimary = { isPrimary: false, button: 0, pointerId: 2 }
      fireEvent.pointerDown(dialog(), primary)
      fireEvent.pointerDown(backdrop(), nonPrimary)
      fireEvent.pointerUp(backdrop(), nonPrimary)
      fireEvent.pointerUp(backdrop(), primary)
      fireEvent.click(backdrop())
      expect(props.onCancel).not.toHaveBeenCalled()
    })

    it('ignores a pointerup from a different pointer', () => {
      const props = dialogProps()
      render(<ConfirmDialog {...props} />)
      fireEvent.pointerDown(backdrop(), primary)
      fireEvent.pointerUp(backdrop(), { ...primary, pointerId: 7 })
      fireEvent.click(backdrop())
      // The recorded press never ended outside the panel.
      expect(props.onCancel).not.toHaveBeenCalled()
    })

    it('forgets the press on pointercancel', () => {
      const props = dialogProps()
      render(<ConfirmDialog {...props} />)
      // Kept, this press (started on the panel) would block the click. Once
      // cleared, the click falls back to the plain-click rule and cancels.
      fireEvent.pointerDown(dialog(), primary)
      fireEvent.pointerCancel(dialog(), primary)
      fireEvent.click(backdrop())
      expect(props.onCancel).toHaveBeenCalledTimes(1)
    })

    it('forgets the press once its click has been handled', () => {
      const props = dialogProps()
      render(<ConfirmDialog {...props} />)
      fireEvent.pointerDown(dialog(), primary)
      fireEvent.pointerUp(backdrop(), primary)
      fireEvent.click(backdrop())
      expect(props.onCancel).not.toHaveBeenCalled()
      // The next click has no press behind it.
      fireEvent.click(backdrop())
      expect(props.onCancel).toHaveBeenCalledTimes(1)
    })
  })

  describe('background isolation', () => {
    it('makes the rest of <body> inert and aria-hidden while open, then restores it', () => {
      const plain = addBodyChild()
      const shown = addBodyChild({ 'aria-hidden': 'false' })
      const alreadyHidden = addBodyChild({ 'aria-hidden': 'true' })
      const alreadyInert = addBodyChild({ inert: '' })

      const props = dialogProps()
      const { container, rerender } = render(<ConfirmDialog {...props} />)
      const appRoot = container

      for (const el of [appRoot, plain, shown, alreadyHidden, alreadyInert]) {
        expect(el).toHaveAttribute('inert')
        expect(el).toHaveAttribute('aria-hidden', 'true')
      }
      // The dialog's own layer is left alone.
      expect(backdrop()).not.toHaveAttribute('inert')
      expect(backdrop()).not.toHaveAttribute('aria-hidden')

      rerender(<ConfirmDialog {...props} open={false} />)

      for (const el of [appRoot, plain]) {
        expect(el).not.toHaveAttribute('inert')
        expect(el).not.toHaveAttribute('aria-hidden')
      }
      expect(shown).not.toHaveAttribute('inert')
      expect(shown).toHaveAttribute('aria-hidden', 'false')
      expect(alreadyHidden).not.toHaveAttribute('inert')
      expect(alreadyHidden).toHaveAttribute('aria-hidden', 'true')
      expect(alreadyInert).toHaveAttribute('inert')
      expect(alreadyInert).not.toHaveAttribute('aria-hidden')
    })

    it('hides background content from role queries while open', () => {
      render(
        <>
          <button type="button">Behind</button>
          <ConfirmDialog {...dialogProps()} />
        </>,
      )
      expect(screen.queryByRole('button', { name: 'Behind' })).not.toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Behind', hidden: true }),
      ).toBeInTheDocument()
      expect(screen.getAllByRole('button')).toHaveLength(2)
    })

    it('restores the background on unmount', () => {
      const sibling = addBodyChild({ 'aria-hidden': 'false' })
      const { unmount } = render(<ConfirmDialog {...dialogProps()} />)
      expect(sibling).toHaveAttribute('aria-hidden', 'true')
      unmount()
      expect(sibling).toHaveAttribute('aria-hidden', 'false')
      expect(sibling).not.toHaveAttribute('inert')
    })

    describe('elements added to <body> while open', () => {
      it('makes a late element inert and aria-hidden, then restores it on close', async () => {
        const props = dialogProps()
        const { rerender } = render(<ConfirmDialog {...props} />)
        const late = addBodyChild()
        const lateShown = addBodyChild({ 'aria-hidden': 'false' })

        await waitFor(() => {
          expect(late).toHaveAttribute('inert')
          expect(late).toHaveAttribute('aria-hidden', 'true')
          expect(lateShown).toHaveAttribute('inert')
          expect(lateShown).toHaveAttribute('aria-hidden', 'true')
        })

        rerender(<ConfirmDialog {...props} open={false} />)

        expect(late).not.toHaveAttribute('inert')
        expect(late).not.toHaveAttribute('aria-hidden')
        expect(lateShown).not.toHaveAttribute('inert')
        expect(lateShown).toHaveAttribute('aria-hidden', 'false')
      })

      it('restores a late element on unmount', async () => {
        const { unmount } = render(<ConfirmDialog {...dialogProps()} />)
        const late = addBodyChild({ 'aria-hidden': 'false' })
        await waitFor(() => expect(late).toHaveAttribute('inert'))
        unmount()
        expect(late).not.toHaveAttribute('inert')
        expect(late).toHaveAttribute('aria-hidden', 'false')
      })

      it('works the same inside <StrictMode>', async () => {
        const props = dialogProps()
        const { container, rerender } = render(
          <StrictMode>
            <ConfirmDialog {...props} />
          </StrictMode>,
        )
        expect(container).toHaveAttribute('inert')
        const late = addBodyChild()
        const lateShown = addBodyChild({ 'aria-hidden': 'false' })
        await waitFor(() => {
          expect(late).toHaveAttribute('inert')
          expect(late).toHaveAttribute('aria-hidden', 'true')
          expect(lateShown).toHaveAttribute('aria-hidden', 'true')
        })

        rerender(
          <StrictMode>
            <ConfirmDialog {...props} open={false} />
          </StrictMode>,
        )

        for (const el of [container, late]) {
          expect(el).not.toHaveAttribute('inert')
          expect(el).not.toHaveAttribute('aria-hidden')
        }
        expect(lateShown).not.toHaveAttribute('inert')
        expect(lateShown).toHaveAttribute('aria-hidden', 'false')

        // No observer survives from StrictMode's extra mount either.
        const afterClose = addBodyChild()
        await flushObservers()
        expect(afterClose).not.toHaveAttribute('inert')
        expect(afterClose).not.toHaveAttribute('aria-hidden')
      })

      it('stops watching <body> once closed', async () => {
        const props = dialogProps()
        const { rerender } = render(<ConfirmDialog {...props} />)
        rerender(<ConfirmDialog {...props} open={false} />)

        const afterClose = addBodyChild({ 'aria-hidden': 'false' })
        await flushObservers()
        expect(afterClose).not.toHaveAttribute('inert')
        expect(afterClose).toHaveAttribute('aria-hidden', 'false')
      })

      it('stops watching <body> once unmounted', async () => {
        const { unmount } = render(<ConfirmDialog {...dialogProps()} />)
        unmount()
        const afterUnmount = addBodyChild()
        await flushObservers()
        expect(afterUnmount).not.toHaveAttribute('inert')
        expect(afterUnmount).not.toHaveAttribute('aria-hidden')
      })
    })
  })

  describe('scroll lock', () => {
    it('locks body scrolling while open and restores the previous value on close', () => {
      document.body.style.overflow = 'scroll'
      const props = dialogProps()
      const { rerender } = render(<ConfirmDialog {...props} />)
      expect(document.body.style.overflow).toBe('hidden')
      rerender(<ConfirmDialog {...props} open={false} />)
      expect(document.body.style.overflow).toBe('scroll')
    })

    it('restores body overflow and padding on unmount', () => {
      document.body.style.paddingRight = '3px'
      const { unmount } = render(<ConfirmDialog {...dialogProps()} />)
      expect(document.body.style.overflow).toBe('hidden')
      unmount()
      expect(document.body.style.overflow).toBe('')
      expect(document.body.style.paddingRight).toBe('3px')
    })
  })
})
