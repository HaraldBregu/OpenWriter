/**
 * Example Component: Editor Preferences
 *
 * Demonstrates how to use the AppContext for managing UI preferences.
 * Shows performance-optimized state updates and validation.
 */

import { useCallback } from 'react'
import { useUIPreferences, useAppActions } from '@/contexts'

export function EditorPreferencesExample() {
  const preferences = useUIPreferences()
  const { updateUIPreferences } = useAppActions()

  // Memoized handlers to prevent unnecessary re-renders
  const handleFontSizeChange = useCallback(
    (value: number) => {
      // Validate range
      const validatedValue = Math.max(10, Math.min(32, value))
      updateUIPreferences({ editorFontSize: validatedValue })
    },
    [updateUIPreferences]
  )

  const handleLineHeightChange = useCallback(
    (value: number) => {
      const validatedValue = Math.max(1.0, Math.min(2.5, value))
      updateUIPreferences({ editorLineHeight: validatedValue })
    },
    [updateUIPreferences]
  )

  const handleToggle = useCallback(
    (key: 'showLineNumbers' | 'enableSpellCheck' | 'compactMode') => {
      updateUIPreferences({ [key]: !preferences[key] })
    },
    [preferences, updateUIPreferences]
  )

  return (
    <div className="space-y-6 p-6 bg-background rounded-lg border">
      <h3 className="text-lg font-semibold">Editor Preferences</h3>

      {/* Font Size */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Font Size</label>
          <span className="text-sm text-muted-foreground">
            {preferences.editorFontSize}px
          </span>
        </div>
        <input
          type="range"
          min="10"
          max="32"
          step="1"
          value={preferences.editorFontSize}
          onChange={(e) => handleFontSizeChange(Number(e.target.value))}
          className="w-full h-2 bg-accent rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Small (10px)</span>
          <span>Large (32px)</span>
        </div>
      </div>

      {/* Line Height */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Line Height</label>
          <span className="text-sm text-muted-foreground">
            {preferences.editorLineHeight.toFixed(1)}
          </span>
        </div>
        <input
          type="range"
          min="1.0"
          max="2.5"
          step="0.1"
          value={preferences.editorLineHeight}
          onChange={(e) => handleLineHeightChange(Number(e.target.value))}
          className="w-full h-2 bg-accent rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Tight (1.0)</span>
          <span>Loose (2.5)</span>
        </div>
      </div>

      {/* Toggles */}
      <div className="space-y-3">
        <ToggleOption
          label="Show Line Numbers"
          description="Display line numbers in the editor gutter"
          checked={preferences.showLineNumbers}
          onChange={() => handleToggle('showLineNumbers')}
        />

        <ToggleOption
          label="Enable Spell Check"
          description="Automatically check spelling as you type"
          checked={preferences.enableSpellCheck}
          onChange={() => handleToggle('enableSpellCheck')}
        />

        <ToggleOption
          label="Compact Mode"
          description="Reduce spacing for a more compact interface"
          checked={preferences.compactMode}
          onChange={() => handleToggle('compactMode')}
        />
      </div>

      {/* Live Preview */}
      <div className="mt-6 p-4 bg-muted rounded-lg">
        <p className="text-xs text-muted-foreground mb-2">Live Preview:</p>
        <div
          style={{
            fontSize: `${preferences.editorFontSize}px`,
            lineHeight: preferences.editorLineHeight,
            fontFamily: 'monospace'
          }}
          className={preferences.compactMode ? 'space-y-0' : 'space-y-2'}
        >
          {preferences.showLineNumbers && (
            <span className="text-muted-foreground mr-4">1</span>
          )}
          <span>The quick brown fox jumps over the lazy dog.</span>
        </div>
      </div>
    </div>
  )
}

interface ToggleOptionProps {
  label: string
  description: string
  checked: boolean
  onChange: () => void
}

function ToggleOption({ label, description, checked, onChange }: ToggleOptionProps) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-1 h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-primary cursor-pointer"
      />
      <div className="flex-1">
        <div className="text-sm font-medium group-hover:text-primary transition-colors">
          {label}
        </div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
    </label>
  )
}
