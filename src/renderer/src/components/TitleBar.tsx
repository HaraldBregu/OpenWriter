import React, { useState, useEffect } from 'react'
import { Menu, PanelLeft, Minus, X } from 'lucide-react'

// Windows-style maximize icon
function MaximizeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 10 10" fill="none">
      <rect x="0.5" y="0.5" width="9" height="9" stroke="currentColor" strokeWidth="1" />
    </svg>
  )
}

// Windows-style restore icon (two overlapping squares)
function RestoreIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 10 10" fill="none">
      <path stroke="currentColor" strokeWidth="1" d="M3 2.5h4.5V7M0.5 0.5h6v6h-6z" />
    </svg>
  )
}

export interface TitleBarProps {
  /** Text displayed centered in the title bar */
  title?: string
  /** Called when the sidebar toggle button is clicked (Windows only) */
  onToggleSidebar?: () => void
  /** Extra Tailwind classes applied to the root element */
  className?: string
}

export function TitleBar({ title = 'Tesseract AI', onToggleSidebar, className = '' }: TitleBarProps) {
  const [isWindows, setIsWindows] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    window.api.getPlatform().then((platform) => {
      setIsWindows(platform === 'win32')
    })
    window.api.windowIsMaximized().then(setIsMaximized)

    const unsub = window.api.onMaximizeChange(setIsMaximized)
    return unsub
  }, [])

  const btnBase = `
    flex items-center justify-center h-full w-[46px]
    text-neutral-600 dark:text-neutral-300
    hover:bg-black/[0.07] dark:hover:bg-white/[0.12]
    active:bg-black/[0.12] dark:active:bg-white/[0.18]
    transition-colors duration-100
  `

  const btnNoHover = `
    flex items-center justify-center h-full w-[46px]
    text-neutral-600 dark:text-neutral-300
  `

  return (
    <div
      className={`relative flex h-12 shrink-0 items-center select-none border-b border-black/[0.08] dark:border-white/[0.05] bg-[#f3f3f3] dark:bg-[#1e1e1e] ${className}`}
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* ── Left: burger menu + sidebar toggle (Windows only) ── */}
      {isWindows && (
        <div
          className="flex items-center h-full z-10"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <button
            type="button"
            onClick={() => window.api.popupMenu()}
            className={btnNoHover}
            title="Application menu"
          >
            <Menu className="h-[18px] w-[18px]" strokeWidth={1.5} />
          </button>

          <button
            type="button"
            onClick={onToggleSidebar}
            className={btnNoHover}
            title="Toggle sidebar"
          >
            <PanelLeft className="h-[18px] w-[18px]" strokeWidth={1.5} />
          </button>
        </div>
      )}

      {/* ── Center: app title (absolutely placed so it's always truly centered) ── */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-sm font-normal tracking-wide text-neutral-500 dark:text-neutral-400">
          {title}
        </span>
      </div>

      {/* ── Spacer (pushes right buttons to the right) ── */}
      <div className="flex-1" />

      {/* ── Right: minimize / maximize / close (Windows only) ── */}
      {isWindows && (
        <div
          className="flex items-center h-full z-10"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <button
            type="button"
            onClick={() => window.api.windowMinimize()}
            className={btnBase}
            title="Minimize"
          >
            <Minus className="h-[17px] w-[17px]" strokeWidth={1.5} />
          </button>

          <button
            type="button"
            onClick={() => window.api.windowMaximize()}
            className={btnBase}
            title={isMaximized ? 'Restore' : 'Maximize'}
          >
            {isMaximized ? <RestoreIcon /> : <MaximizeIcon />}
          </button>

          <button
            type="button"
            onClick={() => window.api.windowClose()}
            className={`
              flex items-center justify-center h-full w-[46px]
              text-neutral-600 dark:text-neutral-300
              hover:bg-[#e81123] hover:text-white
              active:bg-[#c42b1c] active:text-white
              transition-colors duration-100
            `}
            title="Close"
          >
            <X className="h-[17px] w-[17px]" strokeWidth={1.5} />
          </button>
        </div>
      )}
    </div>
  )
}
