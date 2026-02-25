import { useState, useEffect } from 'react'
import { Minus, Square, X, Copy } from 'lucide-react'

type Platform = 'darwin' | 'win32' | 'linux' | 'freebsd' | 'openbsd'

export function WindowControls() {
  const [isMaximized, setIsMaximized] = useState(false)
  const [platform] = useState<Platform>('darwin')

  useEffect(() => {
    if (!window.win) return
    window.win.isMaximized().then(setIsMaximized)
  }, [])

  const handleMinimize = () => {
    window.win?.minimize()
  }

  const handleMaximize = () => {
    window.win?.maximize()
    setIsMaximized(!isMaximized)
  }

  const handleClose = () => {
    window.win?.close()
  }

  // macOS style - traffic lights on the left
  if (platform === 'darwin') {
    return (
      <div className="flex items-center gap-2 pl-1">
        {/* Close button - Red */}
        <button
          onClick={handleClose}
          className="group flex items-center justify-center w-3 h-3 rounded-full bg-[#ff5f57] hover:brightness-90 transition-all"
          title="Close"
        >
          <svg 
            className="w-2 h-2 opacity-0 group-hover:opacity-100 transition-opacity" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="3"
          >
            <path d="M6 6l12 12M6 18L18 6" stroke="#4d0000" />
          </svg>
        </button>
        
        {/* Minimize button - Yellow */}
        <button
          onClick={handleMinimize}
          className="group flex items-center justify-center w-3 h-3 rounded-full bg-[#febc2e] hover:brightness-90 transition-all"
          title="Minimize"
        >
          <svg 
            className="w-2 h-2 opacity-0 group-hover:opacity-100 transition-opacity" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="#994000" 
            strokeWidth="3"
          >
            <path d="M4 12h16" />
          </svg>
        </button>
        
        {/* Maximize button - Green */}
        <button
          onClick={handleMaximize}
          className="group flex items-center justify-center w-3 h-3 rounded-full bg-[#28c840] hover:brightness-90 transition-all"
          title={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? (
            <svg 
              className="w-2 h-2 opacity-0 group-hover:opacity-100 transition-opacity" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="#004d00" 
              strokeWidth="3"
            >
              <rect x="5" y="9" width="10" height="10" rx="1" />
              <path d="M9 9V6a1 1 0 011-1h8a1 1 0 011 1v8a1 1 0 01-1 1h-3" />
            </svg>
          ) : (
            <svg 
              className="w-2 h-2 opacity-0 group-hover:opacity-100 transition-opacity" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="#004d00" 
              strokeWidth="3"
            >
              <rect x="4" y="4" width="16" height="16" rx="2" />
            </svg>
          )}
        </button>
      </div>
    )
  }

  // Windows/Linux style - buttons on the right
  return (
    <div className="flex items-center -mr-2">
      {/* Minimize */}
      <button
        onClick={handleMinimize}
        className="flex items-center justify-center w-11 h-8 hover:bg-white/10 transition-colors"
        title="Minimize"
      >
        <Minus className="w-4 h-4" />
      </button>
      
      {/* Maximize/Restore */}
      <button
        onClick={handleMaximize}
        className="flex items-center justify-center w-11 h-8 hover:bg-white/10 transition-colors"
        title={isMaximized ? 'Restore' : 'Maximize'}
      >
        {isMaximized ? (
          <Copy className="w-3.5 h-3.5" />
        ) : (
          <Square className="w-3 h-3" />
        )}
      </button>
      
      {/* Close */}
      <button
        onClick={handleClose}
        className="flex items-center justify-center w-11 h-8 hover:bg-red-500 transition-colors group"
        title="Close"
      >
        <X className="w-4 h-4 group-hover:text-white" />
      </button>
    </div>
  )
}
