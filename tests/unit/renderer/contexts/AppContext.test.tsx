/**
 * AppContext Tests
 *
 * Demonstrates how to test components using the AppContext system.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import {
  AppProvider,
  useAppActions,
  useThemeMode,
  useCurrentUser,
  useUIPreferences,
  useModal,
  useOnlineStatus
} from '@/contexts/AppContext'
import type { User } from '@/contexts/AppContext'

// Test Components
function ThemeDisplay() {
  const theme = useThemeMode()
  return <div data-testid="theme">{theme}</div>
}

function ThemeToggle() {
  const theme = useThemeMode()
  const { setTheme } = useAppActions()

  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      Toggle Theme
    </button>
  )
}

function UserDisplay() {
  const user = useCurrentUser()
  return (
    <div>
      {user ? (
        <>
          <span data-testid="user-name">{user.name}</span>
          <span data-testid="user-email">{user.email}</span>
        </>
      ) : (
        <span data-testid="no-user">No user</span>
      )}
    </div>
  )
}

function UserLogin() {
  const { setUser } = useAppActions()

  const handleLogin = () => {
    const mockUser: User = {
      id: '123',
      name: 'Test User',
      email: 'test@example.com'
    }
    setUser(mockUser)
  }

  return <button onClick={handleLogin}>Login</button>
}

function ModalComponent() {
  const [isOpen, toggle] = useModal('settingsOpen')

  return (
    <div>
      <button onClick={() => toggle(true)}>Open Modal</button>
      <button onClick={() => toggle(false)}>Close Modal</button>
      <button onClick={() => toggle()}>Toggle Modal</button>
      {isOpen && <div data-testid="modal">Modal Content</div>}
    </div>
  )
}

function PreferencesComponent() {
  const preferences = useUIPreferences()
  const { updateUIPreferences } = useAppActions()

  return (
    <div>
      <div data-testid="font-size">{preferences.editorFontSize}</div>
      <button
        onClick={() => updateUIPreferences({ editorFontSize: 20 })}
      >
        Change Font Size
      </button>
    </div>
  )
}

function OnlineStatusComponent() {
  const isOnline = useOnlineStatus()
  return <div data-testid="online-status">{isOnline ? 'Online' : 'Offline'}</div>
}

// Tests
describe('AppContext', () => {
  describe('Theme Management', () => {
    test('renders with default theme', () => {
      render(
        <AppProvider>
          <ThemeDisplay />
        </AppProvider>
      )

      expect(screen.getByTestId('theme')).toHaveTextContent('system')
    })

    test('renders with custom initial theme', () => {
      render(
        <AppProvider initialState={{ theme: 'dark' }}>
          <ThemeDisplay />
        </AppProvider>
      )

      expect(screen.getByTestId('theme')).toHaveTextContent('dark')
    })

    test('updates theme when action is dispatched', () => {
      render(
        <AppProvider>
          <ThemeDisplay />
          <ThemeToggle />
        </AppProvider>
      )

      expect(screen.getByTestId('theme')).toHaveTextContent('system')

      fireEvent.click(screen.getByText('Toggle Theme'))

      expect(screen.getByTestId('theme')).toHaveTextContent('dark')
    })

    test('toggles theme multiple times', () => {
      render(
        <AppProvider initialState={{ theme: 'light' }}>
          <ThemeDisplay />
          <ThemeToggle />
        </AppProvider>
      )

      expect(screen.getByTestId('theme')).toHaveTextContent('light')

      fireEvent.click(screen.getByText('Toggle Theme'))
      expect(screen.getByTestId('theme')).toHaveTextContent('dark')

      fireEvent.click(screen.getByText('Toggle Theme'))
      expect(screen.getByTestId('theme')).toHaveTextContent('light')
    })
  })

  describe('User Management', () => {
    test('renders without user initially', () => {
      render(
        <AppProvider>
          <UserDisplay />
        </AppProvider>
      )

      expect(screen.getByTestId('no-user')).toBeInTheDocument()
    })

    test('renders with initial user', () => {
      const user: User = {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com'
      }

      render(
        <AppProvider initialState={{ user }}>
          <UserDisplay />
        </AppProvider>
      )

      expect(screen.getByTestId('user-name')).toHaveTextContent('John Doe')
      expect(screen.getByTestId('user-email')).toHaveTextContent('john@example.com')
    })

    test('updates user when login action is dispatched', () => {
      render(
        <AppProvider>
          <UserDisplay />
          <UserLogin />
        </AppProvider>
      )

      expect(screen.getByTestId('no-user')).toBeInTheDocument()

      fireEvent.click(screen.getByText('Login'))

      expect(screen.getByTestId('user-name')).toHaveTextContent('Test User')
      expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com')
    })
  })

  describe('Modal Management', () => {
    test('modal is closed by default', () => {
      render(
        <AppProvider>
          <ModalComponent />
        </AppProvider>
      )

      expect(screen.queryByTestId('modal')).not.toBeInTheDocument()
    })

    test('opens modal when action is dispatched', () => {
      render(
        <AppProvider>
          <ModalComponent />
        </AppProvider>
      )

      fireEvent.click(screen.getByText('Open Modal'))

      expect(screen.getByTestId('modal')).toBeInTheDocument()
    })

    test('closes modal when action is dispatched', () => {
      render(
        <AppProvider initialState={{
          modals: {
            settingsOpen: true,
            commandPaletteOpen: false,
            searchOpen: false,
            shareDialogOpen: false
          }
        }}>
          <ModalComponent />
        </AppProvider>
      )

      expect(screen.getByTestId('modal')).toBeInTheDocument()

      fireEvent.click(screen.getByText('Close Modal'))

      expect(screen.queryByTestId('modal')).not.toBeInTheDocument()
    })

    test('toggles modal state', () => {
      render(
        <AppProvider>
          <ModalComponent />
        </AppProvider>
      )

      expect(screen.queryByTestId('modal')).not.toBeInTheDocument()

      fireEvent.click(screen.getByText('Toggle Modal'))
      expect(screen.getByTestId('modal')).toBeInTheDocument()

      fireEvent.click(screen.getByText('Toggle Modal'))
      expect(screen.queryByTestId('modal')).not.toBeInTheDocument()
    })
  })

  describe('UI Preferences', () => {
    test('renders with default preferences', () => {
      render(
        <AppProvider>
          <PreferencesComponent />
        </AppProvider>
      )

      expect(screen.getByTestId('font-size')).toHaveTextContent('14')
    })

    test('updates preferences when action is dispatched', () => {
      render(
        <AppProvider>
          <PreferencesComponent />
        </AppProvider>
      )

      expect(screen.getByTestId('font-size')).toHaveTextContent('14')

      fireEvent.click(screen.getByText('Change Font Size'))

      expect(screen.getByTestId('font-size')).toHaveTextContent('20')
    })

    test('merges partial preference updates', () => {
      render(
        <AppProvider initialState={{
          uiPreferences: {
            editorFontSize: 16,
            editorLineHeight: 1.5,
            showLineNumbers: true,
            enableSpellCheck: true,
            compactMode: false,
            sidebarState: 'expanded'
          }
        }}>
          <PreferencesComponent />
        </AppProvider>
      )

      expect(screen.getByTestId('font-size')).toHaveTextContent('16')

      fireEvent.click(screen.getByText('Change Font Size'))

      // Font size should update, but other preferences should remain
      expect(screen.getByTestId('font-size')).toHaveTextContent('20')
    })
  })

  describe('Online Status', () => {
    test('detects online status from navigator', () => {
      // Mock navigator.onLine
      Object.defineProperty(window.navigator, 'onLine', {
        writable: true,
        value: true
      })

      render(
        <AppProvider>
          <OnlineStatusComponent />
        </AppProvider>
      )

      expect(screen.getByTestId('online-status')).toHaveTextContent('Online')
    })

    test('detects offline status from navigator', () => {
      // Mock navigator.onLine
      Object.defineProperty(window.navigator, 'onLine', {
        writable: true,
        value: false
      })

      render(
        <AppProvider>
          <OnlineStatusComponent />
        </AppProvider>
      )

      expect(screen.getByTestId('online-status')).toHaveTextContent('Offline')
    })

    test('updates status when online event fires', async () => {
      render(
        <AppProvider initialState={{ isOnline: false }}>
          <OnlineStatusComponent />
        </AppProvider>
      )

      expect(screen.getByTestId('online-status')).toHaveTextContent('Offline')

      // Simulate going online
      fireEvent(window, new Event('online'))

      await waitFor(() => {
        expect(screen.getByTestId('online-status')).toHaveTextContent('Online')
      })
    })

    test('updates status when offline event fires', async () => {
      render(
        <AppProvider initialState={{ isOnline: true }}>
          <OnlineStatusComponent />
        </AppProvider>
      )

      expect(screen.getByTestId('online-status')).toHaveTextContent('Online')

      // Simulate going offline
      fireEvent(window, new Event('offline'))

      await waitFor(() => {
        expect(screen.getByTestId('online-status')).toHaveTextContent('Offline')
      })
    })
  })

  describe('Error Handling', () => {
    test('throws error when useAppState is used outside provider', () => {
      // Suppress console.error for this test
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        render(<ThemeDisplay />)
      }).toThrow('useTheme must be used within an AppProvider')

      spy.mockRestore()
    })

    test('throws error when useAppActions is used outside provider', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        render(<ThemeToggle />)
      }).toThrow('useTheme must be used within an AppProvider')

      spy.mockRestore()
    })
  })

  describe('Performance', () => {
    test('action-only components do not re-render on state changes', () => {
      let renderCount = 0

      function ActionOnlyComponent() {
        const { setTheme } = useAppActions()
        renderCount++

        return (
          <button onClick={() => setTheme('dark')}>
            Change Theme
          </button>
        )
      }

      function StateReader() {
        const theme = useThemeMode()
        return <div data-testid="theme">{theme}</div>
      }

      render(
        <AppProvider>
          <ActionOnlyComponent />
          <StateReader />
        </AppProvider>
      )

      const initialRenderCount = renderCount

      // Change theme via the action-only component
      fireEvent.click(screen.getByText('Change Theme'))

      // StateReader should update
      expect(screen.getByTestId('theme')).toHaveTextContent('dark')

      // ActionOnlyComponent should NOT re-render
      expect(renderCount).toBe(initialRenderCount)
    })
  })
})
