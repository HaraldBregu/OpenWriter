/**
 * Tests for AppState - centralized application quit state.
 *
 * AppState replaces the unsafe (app as { isQuitting?: boolean }).isQuitting
 * pattern with a type-safe class.
 */

import { AppState } from '../../../../src/main/core/AppState'

describe('AppState', () => {
  let appState: AppState

  beforeEach(() => {
    appState = new AppState()
  })

  it('should initialize with isQuitting set to false', () => {
    // Assert
    expect(appState.isQuitting).toBe(false)
  })

  it('should set isQuitting to true when setQuitting is called', () => {
    // Act
    appState.setQuitting()

    // Assert
    expect(appState.isQuitting).toBe(true)
  })

  it('should remain true after multiple setQuitting calls', () => {
    // Act
    appState.setQuitting()
    appState.setQuitting()

    // Assert
    expect(appState.isQuitting).toBe(true)
  })
})
