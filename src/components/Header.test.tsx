import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Header from './Header'

const themeKey = 'taskly-theme'
const darkQuery = '(prefers-color-scheme: dark)'

type ChangeHandler = (e: MediaQueryListEvent) => void

// A fake MediaQueryList that records its 'change' listeners so a test can
// fire a system theme change. Every matchMedia call returns the same object.
function stubSystemTheme(initiallyDark: boolean) {
  const handlers = new Set<ChangeHandler>()
  const mql = {
    matches: initiallyDark,
    media: darkQuery,
    onchange: null,
    addEventListener: vi.fn((type: string, handler: ChangeHandler) => {
      if (type === 'change') handlers.add(handler)
    }),
    removeEventListener: vi.fn((type: string, handler: ChangeHandler) => {
      if (type === 'change') handlers.delete(handler)
    }),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }
  const matchMedia = vi.fn(() => mql)
  vi.stubGlobal('matchMedia', matchMedia)

  function fireChange(matches: boolean) {
    mql.matches = matches
    act(() => {
      for (const handler of [...handlers]) {
        handler({ matches, media: darkQuery } as MediaQueryListEvent)
      }
    })
  }

  return { matchMedia, mql, handlers, fireChange }
}

function themeButton(name: 'Light' | 'Dark' | 'System') {
  return within(screen.getByRole('group', { name: 'Theme' })).getByRole(
    'button',
    { name },
  )
}

function expectPressed(name: 'Light' | 'Dark' | 'System') {
  for (const option of ['Light', 'Dark', 'System'] as const) {
    expect(themeButton(option)).toHaveAttribute(
      'aria-pressed',
      option === name ? 'true' : 'false',
    )
  }
}

const html = () => document.documentElement

describe('Header', () => {
  afterEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
    vi.unstubAllGlobals()
  })

  it('shows the "Taskly" heading and a Theme group with Light / Dark / System in order', () => {
    render(<Header />)
    expect(
      screen.getByRole('heading', { level: 1, name: 'Taskly' }),
    ).toBeInTheDocument()
    const buttons = within(
      screen.getByRole('group', { name: 'Theme' }),
    ).getAllByRole('button')
    expect(buttons.map((b) => b.textContent)).toEqual(['Light', 'Dark', 'System'])
    expectPressed('System')
  })

  it('starts on System with no dark class when nothing is saved and matchMedia is unavailable', () => {
    expect(window.matchMedia).toBeUndefined()
    render(<Header />)
    expectPressed('System')
    expect(html()).not.toHaveClass('dark')
    expect(localStorage.getItem(themeKey)).toBeNull()
  })

  it('follows a dark system setting on System without saving a choice', () => {
    const { matchMedia } = stubSystemTheme(true)
    render(<Header />)
    expect(matchMedia).toHaveBeenCalledWith(darkQuery)
    expectPressed('System')
    expect(html()).toHaveClass('dark')
    expect(localStorage.getItem(themeKey)).toBeNull()
  })

  it('switches between Dark, Light and System and saves the choice', async () => {
    stubSystemTheme(true)
    const user = userEvent.setup()
    render(<Header />)

    await user.click(themeButton('Dark'))
    expectPressed('Dark')
    expect(html()).toHaveClass('dark')
    expect(localStorage.getItem(themeKey)).toBe('dark')

    await user.click(themeButton('Light'))
    expectPressed('Light')
    expect(html()).not.toHaveClass('dark')
    expect(localStorage.getItem(themeKey)).toBe('light')

    // System removes the saved key and follows the (dark) system setting.
    await user.click(themeButton('System'))
    expectPressed('System')
    expect(localStorage.getItem(themeKey)).toBeNull()
    expect(html()).toHaveClass('dark')
  })

  it('choosing System with a light system setting removes the dark class', async () => {
    stubSystemTheme(false)
    localStorage.setItem(themeKey, 'dark')
    const user = userEvent.setup()
    render(<Header />)
    expect(html()).toHaveClass('dark')

    await user.click(themeButton('System'))
    expectPressed('System')
    expect(localStorage.getItem(themeKey)).toBeNull()
    expect(html()).not.toHaveClass('dark')
  })

  it('starts with Dark pressed and the dark class when "dark" is saved', () => {
    localStorage.setItem(themeKey, 'dark')
    render(<Header />)
    expectPressed('Dark')
    expect(html()).toHaveClass('dark')
  })

  it('lets a saved "light" choice override a dark system setting', () => {
    stubSystemTheme(true)
    localStorage.setItem(themeKey, 'light')
    render(<Header />)
    expectPressed('Light')
    expect(html()).not.toHaveClass('dark')
  })

  it('treats an unknown saved value as System', () => {
    stubSystemTheme(true)
    localStorage.setItem(themeKey, 'purple')
    render(<Header />)
    expectPressed('System')
    expect(html()).toHaveClass('dark')
  })

  describe('live system theme changes', () => {
    it('updates the dark class when the system theme changes while on System', () => {
      const { mql, handlers, fireChange } = stubSystemTheme(false)
      render(<Header />)
      expect(mql.addEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function),
      )
      expect(handlers.size).toBe(1)
      expect(html()).not.toHaveClass('dark')

      fireChange(true)
      expect(html()).toHaveClass('dark')
      expectPressed('System')

      fireChange(false)
      expect(html()).not.toHaveClass('dark')
      expect(localStorage.getItem(themeKey)).toBeNull()
    })

    it('ignores system changes after choosing Light, and unsubscribes', async () => {
      const { mql, handlers, fireChange } = stubSystemTheme(false)
      const user = userEvent.setup()
      render(<Header />)
      const [handler] = [...handlers]

      await user.click(themeButton('Light'))
      expect(mql.removeEventListener).toHaveBeenCalledWith('change', handler)
      expect(handlers.size).toBe(0)

      fireChange(true)
      expect(html()).not.toHaveClass('dark')
      expectPressed('Light')
    })

    it('ignores system changes after choosing Dark, and unsubscribes', async () => {
      const { mql, handlers, fireChange } = stubSystemTheme(true)
      const user = userEvent.setup()
      render(<Header />)
      const [handler] = [...handlers]

      await user.click(themeButton('Dark'))
      expect(mql.removeEventListener).toHaveBeenCalledWith('change', handler)
      expect(handlers.size).toBe(0)

      fireChange(false)
      expect(html()).toHaveClass('dark')
      expectPressed('Dark')
    })

    it('subscribes again when switching back to System', async () => {
      const { handlers, fireChange } = stubSystemTheme(false)
      const user = userEvent.setup()
      render(<Header />)

      await user.click(themeButton('Dark'))
      expect(handlers.size).toBe(0)
      await user.click(themeButton('System'))
      expect(handlers.size).toBe(1)
      expect(html()).not.toHaveClass('dark')

      fireChange(true)
      expect(html()).toHaveClass('dark')
    })

    it('removes the listener on unmount', () => {
      const { mql, handlers } = stubSystemTheme(false)
      const { unmount } = render(<Header />)
      const [handler] = [...handlers]

      unmount()
      expect(mql.removeEventListener).toHaveBeenCalledWith('change', handler)
      expect(handlers.size).toBe(0)
    })

    it('does not subscribe when a saved choice is not System', () => {
      const { mql } = stubSystemTheme(true)
      localStorage.setItem(themeKey, 'light')
      render(<Header />)
      expect(mql.addEventListener).not.toHaveBeenCalled()
    })
  })
})
