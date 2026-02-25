/**
 * Tests for PersonalitySettingsPanel component.
 *
 * Tests cover:
 *   - Model select is disabled when no provider is selected (hasProvider=false)
 *   - Creativity Level is disabled when no model is selected (hasModel=false)
 *   - Text Length is disabled when no model is selected (hasModel=false)
 *   - Reasoning toggle is disabled when no model is selected (hasModel=false)
 *   - Creativity Level is disabled for reasoning models even when a model is selected
 *   - Reasoning toggle is disabled for non-reasoning models even when a model is selected
 *   - All controls are enabled when both provider and valid non-reasoning model are selected
 *   - Provider change triggers onSettingsChange with the default model for that provider
 *   - Model change triggers onSettingsChange with the new modelId
 *   - Creativity level change triggers onSettingsChange with matching temperature preset
 *   - Text length change triggers onSettingsChange with matching maxTokens preset
 *   - Reasoning toggle change triggers onSettingsChange with updated reasoning value
 *
 * Mocking strategy:
 *   - AppSelect, AppSwitch, AppSlider, AppInput are mocked with lightweight stubs
 *     that render their props as HTML attributes so we can assert disabled state
 *     without fighting Radix UI's jsdom limitations.
 *   - aiProviders config is used directly (not mocked) so tests reflect real data.
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ---------------------------------------------------------------------------
// Mocks — must come before the component import
// ---------------------------------------------------------------------------

// Mock AppSelect and its sub-components as lightweight native <select> stubs
jest.mock('../../../../src/renderer/src/components/app/AppSelect', () => ({
  AppSelect: ({
    children,
    value,
    onValueChange,
    disabled
  }: {
    children: React.ReactNode
    value: string
    onValueChange?: (v: string) => void
    disabled?: boolean
  }) =>
    React.createElement(
      'select',
      {
        'data-value': value,
        disabled: disabled ?? false,
        onChange: (e: React.ChangeEvent<HTMLSelectElement>) => onValueChange?.(e.target.value)
      },
      children
    ),

  AppSelectTrigger: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),

  AppSelectValue: () => React.createElement(React.Fragment, null),

  AppSelectContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),

  AppSelectItem: ({ value, children }: { value: string; children: React.ReactNode }) =>
    React.createElement('option', { value }, children)
}))

// Mock AppLabel as a plain <label>
jest.mock('../../../../src/renderer/src/components/app/AppLabel', () => ({
  AppLabel: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('label', { className }, children)
}))

// Mock AppInput as a plain <input>
jest.mock('../../../../src/renderer/src/components/app/AppInput', () => ({
  AppInput: (props: React.InputHTMLAttributes<HTMLInputElement>) =>
    React.createElement('input', { ...props, 'data-testid': 'custom-max-tokens-input' })
}))

// Mock AppSlider as a plain <input type="range">
jest.mock('../../../../src/renderer/src/components/app/AppSlider', () => ({
  AppSlider: ({
    min,
    max,
    step,
    value,
    onValueChange
  }: {
    min: number
    max: number
    step: number
    value: number
    onValueChange?: (v: number) => void
  }) =>
    React.createElement('input', {
      type: 'range',
      'data-testid': 'temperature-slider',
      min,
      max,
      step,
      value,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        onValueChange?.(parseFloat(e.target.value))
    })
}))

// Mock AppSwitch — render as <button role="switch"> so we can assert disabled
jest.mock('../../../../src/renderer/src/components/app/AppSwitch', () => ({
  AppSwitch: ({
    checked,
    onCheckedChange,
    disabled
  }: {
    checked: boolean
    onCheckedChange?: (v: boolean) => void
    disabled?: boolean
  }) =>
    React.createElement('button', {
      role: 'switch',
      'aria-checked': checked,
      disabled: disabled ?? false,
      'data-testid': 'reasoning-switch',
      onClick: () => onCheckedChange?.(!checked)
    })
}))

// Import after mocks
import { PersonalitySettingsPanel, type InferenceSettings } from '../../../../src/renderer/src/components/personality/PersonalitySettingsSheet'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Default settings — OpenAI + gpt-4o (a non-reasoning model). */
const DEFAULT_SETTINGS: InferenceSettings = {
  providerId: 'openai',
  modelId: 'gpt-4o',
  temperature: 0.7,
  maxTokens: 2048,
  reasoning: false
}

/** Settings with a reasoning model selected (o1). */
const REASONING_MODEL_SETTINGS: InferenceSettings = {
  providerId: 'openai',
  modelId: 'o1',
  temperature: 0.7,
  maxTokens: null,
  reasoning: false
}

/** Settings with empty providerId — simulates "no provider selected". */
const NO_PROVIDER_SETTINGS: InferenceSettings = {
  providerId: '',
  modelId: '',
  temperature: 0.7,
  maxTokens: null,
  reasoning: false
}

/** Settings with a valid provider but a modelId that does not belong to that provider. */
const NO_MODEL_SETTINGS: InferenceSettings = {
  providerId: 'openai',
  modelId: 'nonexistent-model',
  temperature: 0.7,
  maxTokens: null,
  reasoning: false
}

function renderPanel(settings: InferenceSettings = DEFAULT_SETTINGS, onSettingsChange = jest.fn()) {
  return render(
    <PersonalitySettingsPanel settings={settings} onSettingsChange={onSettingsChange} />
  )
}

/**
 * Helper: get the <select> element whose rendered options include the given label text.
 * We identify selects by the label text rendered immediately before them.
 */
function getSelectByLabel(labelText: string): HTMLSelectElement {
  const label = screen.getByText(labelText)
  // The select is a sibling of the label inside the same parent div
  const parent = label.parentElement!
  const select = parent.querySelector('select')
  if (!select) throw new Error(`No <select> found under label "${labelText}"`)
  return select as HTMLSelectElement
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PersonalitySettingsPanel', () => {
  describe('section header', () => {
    it('should render the Inference Settings heading', () => {
      renderPanel()
      expect(screen.getByText('Inference Settings')).toBeInTheDocument()
    })
  })

  describe('Provider select', () => {
    it('should always be enabled regardless of current selection', () => {
      renderPanel(NO_PROVIDER_SETTINGS)
      const providerSelect = getSelectByLabel('Provider')
      expect(providerSelect).not.toBeDisabled()
    })

    it('should reflect the current providerId value', () => {
      renderPanel(DEFAULT_SETTINGS)
      const providerSelect = getSelectByLabel('Provider')
      expect(providerSelect.getAttribute('data-value')).toBe('openai')
    })
  })

  describe('Model select — disabled state', () => {
    it('should be disabled when no provider is selected', () => {
      // Arrange — empty providerId means no provider found in aiProviders
      renderPanel(NO_PROVIDER_SETTINGS)

      // Act
      const modelSelect = getSelectByLabel('Model')

      // Assert
      expect(modelSelect).toBeDisabled()
    })

    it('should be enabled when a valid provider is selected', () => {
      renderPanel(DEFAULT_SETTINGS)
      const modelSelect = getSelectByLabel('Model')
      expect(modelSelect).not.toBeDisabled()
    })

    it('should reflect the current modelId value', () => {
      renderPanel(DEFAULT_SETTINGS)
      const modelSelect = getSelectByLabel('Model')
      expect(modelSelect.getAttribute('data-value')).toBe('gpt-4o')
    })
  })

  describe('Creativity Level select — disabled state', () => {
    it('should be disabled when no model is found for the current provider', () => {
      // Arrange — provider is set but modelId does not belong to that provider
      renderPanel(NO_MODEL_SETTINGS)

      // Act
      const creativitySelect = getSelectByLabel('Creativity Level')

      // Assert
      expect(creativitySelect).toBeDisabled()
    })

    it('should be disabled when no provider is selected at all', () => {
      renderPanel(NO_PROVIDER_SETTINGS)
      const creativitySelect = getSelectByLabel('Creativity Level')
      expect(creativitySelect).toBeDisabled()
    })

    it('should be disabled for reasoning models (temperature not supported)', () => {
      // Arrange — o1 is a reasoning model
      renderPanel(REASONING_MODEL_SETTINGS)

      // Act
      const creativitySelect = getSelectByLabel('Creativity Level')

      // Assert
      expect(creativitySelect).toBeDisabled()
    })

    it('should be enabled when provider and non-reasoning model are selected', () => {
      renderPanel(DEFAULT_SETTINGS)
      const creativitySelect = getSelectByLabel('Creativity Level')
      expect(creativitySelect).not.toBeDisabled()
    })

    it('should show a note about reasoning models when a reasoning model is active', () => {
      renderPanel(REASONING_MODEL_SETTINGS)
      expect(screen.getByText('Not supported for reasoning models.')).toBeInTheDocument()
    })

    it('should NOT show the reasoning model note for non-reasoning models', () => {
      renderPanel(DEFAULT_SETTINGS)
      expect(screen.queryByText('Not supported for reasoning models.')).not.toBeInTheDocument()
    })
  })

  describe('Text Length select — disabled state', () => {
    it('should be disabled when no model is found for the current provider', () => {
      renderPanel(NO_MODEL_SETTINGS)
      const textLengthSelect = getSelectByLabel('Text Length')
      expect(textLengthSelect).toBeDisabled()
    })

    it('should be disabled when no provider is selected', () => {
      renderPanel(NO_PROVIDER_SETTINGS)
      const textLengthSelect = getSelectByLabel('Text Length')
      expect(textLengthSelect).toBeDisabled()
    })

    it('should be enabled when provider and model are both valid', () => {
      renderPanel(DEFAULT_SETTINGS)
      const textLengthSelect = getSelectByLabel('Text Length')
      expect(textLengthSelect).not.toBeDisabled()
    })

    it('should be enabled for reasoning models (maxTokens is still configurable)', () => {
      // Text Length is only gated on hasModel, not on modelIsReasoning
      renderPanel(REASONING_MODEL_SETTINGS)
      const textLengthSelect = getSelectByLabel('Text Length')
      expect(textLengthSelect).not.toBeDisabled()
    })
  })

  describe('Reasoning toggle — disabled state', () => {
    it('should be disabled when no model is selected', () => {
      renderPanel(NO_MODEL_SETTINGS)
      const reasoningSwitch = screen.getByRole('switch')
      expect(reasoningSwitch).toBeDisabled()
    })

    it('should be disabled when no provider is selected', () => {
      renderPanel(NO_PROVIDER_SETTINGS)
      const reasoningSwitch = screen.getByRole('switch')
      expect(reasoningSwitch).toBeDisabled()
    })

    it('should be disabled for non-reasoning models (reasoning is not applicable)', () => {
      // gpt-4o is not a reasoning model — toggle should be disabled
      renderPanel(DEFAULT_SETTINGS)
      const reasoningSwitch = screen.getByRole('switch')
      expect(reasoningSwitch).toBeDisabled()
    })

    it('should be enabled when a reasoning model is selected', () => {
      // o1 is a reasoning model — toggle should be enabled
      renderPanel(REASONING_MODEL_SETTINGS)
      const reasoningSwitch = screen.getByRole('switch')
      expect(reasoningSwitch).not.toBeDisabled()
    })

    it('should reflect the current reasoning value via aria-checked', () => {
      // Arrange — reasoning is false
      renderPanel({ ...REASONING_MODEL_SETTINGS, reasoning: false })
      expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false')

      // Arrange — reasoning is true
      renderPanel({ ...REASONING_MODEL_SETTINGS, reasoning: true })
      expect(screen.getAllByRole('switch')[0]).toHaveAttribute('aria-checked', 'true')
    })
  })

  describe('all controls enabled with valid provider + non-reasoning model', () => {
    it('should have Provider enabled', () => {
      renderPanel(DEFAULT_SETTINGS)
      expect(getSelectByLabel('Provider')).not.toBeDisabled()
    })

    it('should have Model enabled', () => {
      renderPanel(DEFAULT_SETTINGS)
      expect(getSelectByLabel('Model')).not.toBeDisabled()
    })

    it('should have Creativity Level enabled', () => {
      renderPanel(DEFAULT_SETTINGS)
      expect(getSelectByLabel('Creativity Level')).not.toBeDisabled()
    })

    it('should have Text Length enabled', () => {
      renderPanel(DEFAULT_SETTINGS)
      expect(getSelectByLabel('Text Length')).not.toBeDisabled()
    })

    it('should have Reasoning disabled (non-reasoning model, reasoning not applicable)', () => {
      // Reasoning toggle is disabled for non-reasoning models even when all other controls work
      renderPanel(DEFAULT_SETTINGS)
      expect(screen.getByRole('switch')).toBeDisabled()
    })
  })

  describe('provider change callback', () => {
    it('should call onSettingsChange with the default model for the new provider', async () => {
      // Arrange
      const onSettingsChange = jest.fn()
      const user = userEvent.setup()
      renderPanel(DEFAULT_SETTINGS, onSettingsChange)

      // Act — change provider to anthropic
      const providerSelect = getSelectByLabel('Provider')
      await user.selectOptions(providerSelect, 'anthropic')

      // Assert
      expect(onSettingsChange).toHaveBeenCalledWith(
        expect.objectContaining({
          providerId: 'anthropic',
          modelId: 'claude-opus-4-6'  // first model in anthropic provider list
        })
      )
    })
  })

  describe('model change callback', () => {
    it('should call onSettingsChange with the new modelId', async () => {
      // Arrange
      const onSettingsChange = jest.fn()
      const user = userEvent.setup()
      renderPanel(DEFAULT_SETTINGS, onSettingsChange)

      // Act — change model to gpt-4o-mini
      const modelSelect = getSelectByLabel('Model')
      await user.selectOptions(modelSelect, 'gpt-4o-mini')

      // Assert
      expect(onSettingsChange).toHaveBeenCalledWith(
        expect.objectContaining({
          modelId: 'gpt-4o-mini'
        })
      )
    })

    it('should set reasoning to false when switching to a non-reasoning model', async () => {
      // Arrange — start with a reasoning model that has reasoning: true
      const settings: InferenceSettings = { ...REASONING_MODEL_SETTINGS, reasoning: true }
      const onSettingsChange = jest.fn()
      const user = userEvent.setup()
      renderPanel(settings, onSettingsChange)

      // Act — switch to non-reasoning model gpt-4o
      const modelSelect = getSelectByLabel('Model')
      await user.selectOptions(modelSelect, 'gpt-4o')

      // Assert — reasoning must be reset to false
      expect(onSettingsChange).toHaveBeenCalledWith(
        expect.objectContaining({
          modelId: 'gpt-4o',
          reasoning: false
        })
      )
    })

    it('should preserve reasoning value when switching to another reasoning model', async () => {
      // Arrange — start with o1 and reasoning: true
      const settings: InferenceSettings = { ...REASONING_MODEL_SETTINGS, reasoning: true }
      const onSettingsChange = jest.fn()
      const user = userEvent.setup()
      renderPanel(settings, onSettingsChange)

      // Act — switch to o3-mini (another reasoning model)
      const modelSelect = getSelectByLabel('Model')
      await user.selectOptions(modelSelect, 'o3-mini')

      // Assert — reasoning remains true
      expect(onSettingsChange).toHaveBeenCalledWith(
        expect.objectContaining({
          modelId: 'o3-mini',
          reasoning: true
        })
      )
    })
  })

  describe('creativity level change callback', () => {
    it('should call onSettingsChange with the preset temperature for "precise"', async () => {
      // Arrange
      const onSettingsChange = jest.fn()
      const user = userEvent.setup()
      renderPanel(DEFAULT_SETTINGS, onSettingsChange)

      // Act
      const creativitySelect = getSelectByLabel('Creativity Level')
      await user.selectOptions(creativitySelect, 'precise')

      // Assert — 'precise' preset maps to temperature 0.2
      expect(onSettingsChange).toHaveBeenCalledWith(
        expect.objectContaining({ temperature: 0.2 })
      )
    })

    it('should call onSettingsChange with the preset temperature for "creative"', async () => {
      // Arrange
      const onSettingsChange = jest.fn()
      const user = userEvent.setup()
      renderPanel(DEFAULT_SETTINGS, onSettingsChange)

      // Act
      const creativitySelect = getSelectByLabel('Creativity Level')
      await user.selectOptions(creativitySelect, 'creative')

      // Assert — 'creative' preset maps to temperature 0.8
      expect(onSettingsChange).toHaveBeenCalledWith(
        expect.objectContaining({ temperature: 0.8 })
      )
    })

    it('should NOT call onSettingsChange when "custom" is selected (keeps current value)', async () => {
      // Arrange
      const onSettingsChange = jest.fn()
      const user = userEvent.setup()
      renderPanel(DEFAULT_SETTINGS, onSettingsChange)

      // Act
      const creativitySelect = getSelectByLabel('Creativity Level')
      await user.selectOptions(creativitySelect, 'custom')

      // Assert — 'custom' has temperature=null, no onSettingsChange call for temperature
      expect(onSettingsChange).not.toHaveBeenCalled()
    })
  })

  describe('text length change callback', () => {
    it('should call onSettingsChange with 500 maxTokens for "short"', async () => {
      // Arrange
      const onSettingsChange = jest.fn()
      const user = userEvent.setup()
      renderPanel(DEFAULT_SETTINGS, onSettingsChange)

      // Act
      const textLengthSelect = getSelectByLabel('Text Length')
      await user.selectOptions(textLengthSelect, 'short')

      // Assert — 'short' preset maps to maxTokens 500
      expect(onSettingsChange).toHaveBeenCalledWith(
        expect.objectContaining({ maxTokens: 500 })
      )
    })

    it('should call onSettingsChange with null maxTokens for "unlimited"', async () => {
      // Arrange
      const onSettingsChange = jest.fn()
      const user = userEvent.setup()
      renderPanel(DEFAULT_SETTINGS, onSettingsChange)

      // Act
      const textLengthSelect = getSelectByLabel('Text Length')
      await user.selectOptions(textLengthSelect, 'unlimited')

      // Assert — 'unlimited' maps to maxTokens null
      expect(onSettingsChange).toHaveBeenCalledWith(
        expect.objectContaining({ maxTokens: null })
      )
    })
  })

  describe('reasoning toggle callback', () => {
    it('should call onSettingsChange toggling reasoning from false to true', async () => {
      // Arrange — reasoning model with reasoning: false
      const settings: InferenceSettings = { ...REASONING_MODEL_SETTINGS, reasoning: false }
      const onSettingsChange = jest.fn()
      const user = userEvent.setup()
      renderPanel(settings, onSettingsChange)

      // Act
      const reasoningSwitch = screen.getByRole('switch')
      await user.click(reasoningSwitch)

      // Assert
      expect(onSettingsChange).toHaveBeenCalledWith(
        expect.objectContaining({ reasoning: true })
      )
    })

    it('should call onSettingsChange toggling reasoning from true to false', async () => {
      // Arrange — reasoning model with reasoning: true
      const settings: InferenceSettings = { ...REASONING_MODEL_SETTINGS, reasoning: true }
      const onSettingsChange = jest.fn()
      const user = userEvent.setup()
      renderPanel(settings, onSettingsChange)

      // Act
      const reasoningSwitch = screen.getByRole('switch')
      await user.click(reasoningSwitch)

      // Assert
      expect(onSettingsChange).toHaveBeenCalledWith(
        expect.objectContaining({ reasoning: false })
      )
    })
  })
})
