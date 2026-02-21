/**
 * App Context Demo Page
 *
 * A comprehensive demonstration of all AppContext features.
 * This can be used as a reference or added to a demo/debug page.
 */

import React from 'react'
import {
  useAppState,
  useAppActions,
  useThemeMode,
  useCurrentUser,
  useOnlineStatus,
  useLastSyncTime
} from '@/contexts'
import type { User } from '@/contexts'
import { ThemeToggleExample, CompactThemeToggle } from './ThemeToggle.example'
import { EditorPreferencesExample } from './EditorPreferences.example'
import {
  OnlineStatusIndicatorExample,
  CompactOnlineStatus,
  DetailedStatusPanel
} from './OnlineStatusIndicator.example'
import {
  SettingsModalExample,
  ModalTriggers,
  CommandPaletteExample,
  ModalStateMonitor
} from './ModalManager.example'

export function AppContextDemo() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">App Context System Demo</h1>
          <p className="text-muted-foreground">
            A comprehensive showcase of the React Context state management system
          </p>
        </div>

        {/* State Overview */}
        <StateOverview />

        {/* Theme Management */}
        <Section title="Theme Management">
          <div className="space-y-4">
            <ThemeToggleExample />
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Compact version:</span>
              <CompactThemeToggle />
            </div>
          </div>
        </Section>

        {/* User Management */}
        <Section title="User Management">
          <UserManagementExample />
        </Section>

        {/* UI Preferences */}
        <Section title="UI Preferences">
          <EditorPreferencesExample />
        </Section>

        {/* Online Status */}
        <Section title="Online Status">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <OnlineStatusIndicatorExample />
              <div className="flex items-center gap-4 p-4 border rounded-lg">
                <span className="text-sm text-muted-foreground">Compact:</span>
                <CompactOnlineStatus />
              </div>
            </div>
            <DetailedStatusPanel />
          </div>
        </Section>

        {/* Modal Management */}
        <Section title="Modal Management">
          <div className="space-y-4">
            <ModalTriggers />
            <div className="text-sm text-muted-foreground">
              Try keyboard shortcuts: ⌘K for command palette, Escape to close modals
            </div>
          </div>
        </Section>

        {/* Performance Optimization Examples */}
        <Section title="Performance Optimization Examples">
          <PerformanceExamples />
        </Section>
      </div>

      {/* Modals */}
      <SettingsModalExample />
      <CommandPaletteExample />

      {/* Dev Tools */}
      {process.env.NODE_ENV === 'development' && <ModalStateMonitor />}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">{title}</h2>
      {children}
    </section>
  )
}

/**
 * State Overview - Shows all current state values
 */
function StateOverview() {
  const state = useAppState()

  return (
    <div className="p-6 bg-muted/50 rounded-lg border">
      <h3 className="text-lg font-semibold mb-4">Current State</h3>
      <pre className="text-xs font-mono overflow-x-auto p-4 bg-background rounded border">
        {JSON.stringify(state, null, 2)}
      </pre>
    </div>
  )
}

/**
 * User Management Example
 */
function UserManagementExample() {
  const user = useCurrentUser()
  const { setUser } = useAppActions()

  const handleLogin = () => {
    const mockUser: User = {
      id: '123',
      name: 'John Doe',
      email: 'john@example.com',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John'
    }
    setUser(mockUser)
  }

  const handleLogout = () => {
    setUser(null)
  }

  if (!user) {
    return (
      <div className="p-6 bg-card rounded-lg border text-center">
        <p className="text-muted-foreground mb-4">No user logged in</p>
        <button
          onClick={handleLogin}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Sign In (Mock)
        </button>
      </div>
    )
  }

  return (
    <div className="p-6 bg-card rounded-lg border">
      <div className="flex items-center gap-4 mb-4">
        {user.avatar && (
          <img
            src={user.avatar}
            alt={user.name}
            className="h-16 w-16 rounded-full"
          />
        )}
        <div className="flex-1">
          <h3 className="text-lg font-semibold">{user.name}</h3>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <p className="text-xs text-muted-foreground">ID: {user.id}</p>
        </div>
      </div>
      <button
        onClick={handleLogout}
        className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors"
      >
        Sign Out
      </button>
    </div>
  )
}

/**
 * Performance Optimization Examples
 */
function PerformanceExamples() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Example 1: Read-only component (no re-renders) */}
      <div className="p-6 bg-card rounded-lg border">
        <h4 className="font-semibold mb-2 text-green-600">Optimized: Actions Only</h4>
        <p className="text-sm text-muted-foreground mb-4">
          This component only dispatches actions and never re-renders when state changes.
        </p>
        <ActionOnlyComponent />
      </div>

      {/* Example 2: Selective reading (minimal re-renders) */}
      <div className="p-6 bg-card rounded-lg border">
        <h4 className="font-semibold mb-2 text-green-600">Optimized: Selective Reading</h4>
        <p className="text-sm text-muted-foreground mb-4">
          This component only re-renders when the specific value it needs changes.
        </p>
        <SelectiveReadComponent />
      </div>

      {/* Example 3: Full state access (many re-renders) */}
      <div className="p-6 bg-card rounded-lg border">
        <h4 className="font-semibold mb-2 text-yellow-600">Unoptimized: Full State</h4>
        <p className="text-sm text-muted-foreground mb-4">
          This component re-renders on every state change (not recommended).
        </p>
        <FullStateComponent />
      </div>

      {/* Example 4: Multiple selective reads (balanced) */}
      <div className="p-6 bg-card rounded-lg border">
        <h4 className="font-semibold mb-2 text-blue-600">Balanced: Multiple Values</h4>
        <p className="text-sm text-muted-foreground mb-4">
          This component reads multiple values efficiently using specialized hooks.
        </p>
        <MultiValueComponent />
      </div>
    </div>
  )
}

// Action-only component - never re-renders
function ActionOnlyComponent() {
  const { updateSyncTime } = useAppActions()
  const renderCount = React.useRef(0)
  renderCount.current++

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-2">
        Render count: {renderCount.current}
      </p>
      <button
        onClick={() => updateSyncTime(Date.now())}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm"
      >
        Update Sync Time
      </button>
    </div>
  )
}

// Selective reading - only re-renders when theme changes
function SelectiveReadComponent() {
  const theme = useThemeMode()
  const renderCount = React.useRef(0)
  renderCount.current++

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-2">
        Render count: {renderCount.current}
      </p>
      <p className="text-sm">Current theme: {theme}</p>
    </div>
  )
}

// Full state access - re-renders on any state change
function FullStateComponent() {
  const state = useAppState()
  const renderCount = React.useRef(0)
  renderCount.current++

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-2">
        Render count: {renderCount.current}
      </p>
      <p className="text-sm">Theme: {state.theme}</p>
    </div>
  )
}

// Multiple values with specialized hooks - balanced approach
function MultiValueComponent() {
  const theme = useThemeMode()
  const isOnline = useOnlineStatus()
  const lastSyncTime = useLastSyncTime()
  const renderCount = React.useRef(0)
  renderCount.current++

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-2">
        Render count: {renderCount.current}
      </p>
      <div className="text-sm space-y-1">
        <p>Theme: {theme}</p>
        <p>Online: {isOnline ? 'Yes' : 'No'}</p>
        <p>Last sync: {lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString() : 'Never'}</p>
      </div>
    </div>
  )
}
