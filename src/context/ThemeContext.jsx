import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('thikana_theme') === 'dark'
    }
    return false
  })

  // Apply theme class + localStorage
  useEffect(() => {
    const root = document.documentElement
    if (dark) {
      root.classList.add('dark')
      root.setAttribute('data-theme', 'dark')
      localStorage.setItem('thikana_theme', 'dark')
    } else {
      root.classList.remove('dark')
      root.setAttribute('data-theme', 'light')
      localStorage.setItem('thikana_theme', 'light')
    }
  }, [dark])

  /**
   * toggleTheme(event?)
   * If the browser supports View Transitions API, runs a circular reveal
   * expanding from the clicked button. Falls back to an instant toggle.
   */
  const toggleTheme = (e) => {
    // Fallback: no View Transitions support
    if (!document.startViewTransition) {
      setDark(v => !v)
      return
    }

    // Get click origin — center of the button, or centre of screen as fallback
    const x = e?.clientX ?? window.innerWidth / 2
    const y = e?.clientY ?? window.innerHeight / 2

    // Furthest corner distance = radius the circle must grow to cover the screen
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    )

    const transition = document.startViewTransition(() => {
      setDark(v => !v)
    })

    // Once the old snapshot is ready, kick off the clip-path expansion
    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 1000,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          pseudoElement: '::view-transition-new(root)',
        }
      )
    })
  }

  return (
    <ThemeContext.Provider value={{ dark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be inside <ThemeProvider>')
  return ctx
}
