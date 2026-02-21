/**
 * Example Component: Modal Manager
 *
 * Demonstrates how to use the AppContext for managing modal states.
 * Shows best practices for modal state management and cleanup.
 */

import React, { useEffect } from 'react'
import { useModal, useModalStates, useAppActions } from '@/contexts'
import { X, Settings, Search, Share2, Command } from 'lucide-react'

/**
 * Individual Modal Example
 */
export function SettingsModalExample() {
  const [isOpen, toggleSettings] = useModal('settingsOpen')

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        toggleSettings(false)
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, toggleSettings])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => toggleSettings(false)}
      />

      {/* Modal */}
      <div className="relative bg-background rounded-lg shadow-lg w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Settings</h2>
          </div>
          <button
            onClick={() => toggleSettings(false)}
            className="p-1 rounded-md hover:bg-accent transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-8rem)]">
          <p className="text-sm text-muted-foreground">
            Settings content goes here...
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-6 border-t">
          <button
            onClick={() => toggleSettings(false)}
            className="px-4 py-2 rounded-md hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              // Save logic here
              toggleSettings(false)
            }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Modal Trigger Buttons
 */
export function ModalTriggers() {
  const { toggleModal } = useAppActions()

  return (
    <div className="flex flex-wrap gap-2 p-4">
      <ModalButton
        icon={Settings}
        label="Settings"
        onClick={() => toggleModal('settingsOpen', true)}
        shortcut="⌘,"
      />
      <ModalButton
        icon={Command}
        label="Command Palette"
        onClick={() => toggleModal('commandPaletteOpen', true)}
        shortcut="⌘K"
      />
      <ModalButton
        icon={Search}
        label="Search"
        onClick={() => toggleModal('searchOpen', true)}
        shortcut="⌘F"
      />
      <ModalButton
        icon={Share2}
        label="Share"
        onClick={() => toggleModal('shareDialogOpen', true)}
      />
    </div>
  )
}

interface ModalButtonProps {
  icon: React.ElementType
  label: string
  onClick: () => void
  shortcut?: string
}

function ModalButton({ icon: Icon, label, onClick, shortcut }: ModalButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 bg-background border rounded-md hover:bg-accent hover:text-accent-foreground transition-colors group"
    >
      <Icon className="h-4 w-4" />
      <span className="text-sm">{label}</span>
      {shortcut && (
        <span className="ml-auto text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
          {shortcut}
        </span>
      )}
    </button>
  )
}

/**
 * Command Palette with Keyboard Shortcuts
 */
export function CommandPaletteExample() {
  const [isOpen, togglePalette] = useModal('commandPaletteOpen')
  const { toggleModal } = useAppActions()

  // Global keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        togglePalette()
      }
    }

    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [togglePalette])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        togglePalette(false)
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, togglePalette])

  if (!isOpen) return null

  const commands = [
    { label: 'Open Settings', icon: Settings, action: () => toggleModal('settingsOpen', true) },
    { label: 'Search Documents', icon: Search, action: () => toggleModal('searchOpen', true) },
    { label: 'Share', icon: Share2, action: () => toggleModal('shareDialogOpen', true) }
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => togglePalette(false)}
      />

      <div className="relative bg-background rounded-lg shadow-2xl w-full max-w-2xl border">
        <div className="p-4 border-b">
          <input
            type="text"
            placeholder="Type a command or search..."
            className="w-full px-3 py-2 bg-transparent border-none outline-none text-sm"
            autoFocus
          />
        </div>

        <div className="max-h-96 overflow-y-auto">
          {commands.map((cmd) => (
            <button
              key={cmd.label}
              onClick={() => {
                cmd.action()
                togglePalette(false)
              }}
              className="flex items-center gap-3 w-full px-4 py-3 hover:bg-accent transition-colors text-left"
            >
              <cmd.icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{cmd.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Modal State Monitor (for debugging)
 */
export function ModalStateMonitor() {
  const modals = useModalStates()

  return (
    <div className="fixed bottom-4 right-4 p-4 bg-background border rounded-lg shadow-lg">
      <h3 className="text-xs font-semibold mb-2 text-muted-foreground">
        Modal States (Dev)
      </h3>
      <div className="space-y-1 text-xs font-mono">
        {Object.entries(modals).map(([key, value]) => (
          <div key={key} className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${
                value ? 'bg-green-500' : 'bg-gray-300'
              }`}
            />
            <span className={value ? 'text-green-600' : 'text-muted-foreground'}>
              {key}: {value ? 'open' : 'closed'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
