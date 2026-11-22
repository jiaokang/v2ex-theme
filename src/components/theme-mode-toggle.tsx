import { useEffect, useState } from 'react'
import { Toggle } from '@ui-sdk/react/toggle'
import Moon from 'lucide-react/icons/moon'
import Sun from 'lucide-react/icons/sun'

export const COLOR_MODE_STORAGE_KEY = 'v2ex-theme-hub:color-mode'

// Applied inline in <head> before first paint to prevent light/dark flash on reload.
export const colorModeInitScript = `(() => {
  try {
    const mode = localStorage.getItem(${JSON.stringify(COLOR_MODE_STORAGE_KEY)});
    if (mode === 'dark' || mode === 'light') {
      document.documentElement.classList.add(mode);
    }
  } catch {}
})();`

function readIsDark() {
  const root = document.documentElement
  if (root.classList.contains('dark')) return true
  if (root.classList.contains('light')) return false
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

function applyColorMode(dark: boolean) {
  const root = document.documentElement
  root.classList.toggle('dark', dark)
  root.classList.toggle('light', !dark)
  try {
    window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, dark ? 'dark' : 'light')
  } catch {}
}

export function ThemeModeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    setDark(readIsDark())
    const media = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!media) return
    const onChange = (event: MediaQueryListEvent) => {
      const root = document.documentElement
      if (!root.classList.contains('dark') && !root.classList.contains('light')) {
        setDark(event.matches)
      }
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  function handlePressedChange(next: boolean) {
    setDark(next)
    applyColorMode(next)
  }

  return (
    <Toggle
      className="frame-icon-button"
      pressed={dark}
      onPressedChange={handlePressedChange}
      aria-label="深色模式"
      title={dark ? '切换到浅色模式' : '切换到深色模式'}
    >
      {dark
        ? <Sun className="ui-icon" aria-hidden="true" />
        : <Moon className="ui-icon" aria-hidden="true" />}
    </Toggle>
  )
}
