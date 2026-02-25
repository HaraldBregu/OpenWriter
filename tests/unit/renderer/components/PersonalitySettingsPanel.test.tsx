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
 *   - react-i18next is mocked to return the translation key as-is so we can
 *     find elements by their i18n key strings (e.g. "inferenceSettings.provider").
 *   - AppSelect and its sub-components are mocked as lightweight native HTML stubs
 *     so we can assert the `disabled` prop without Radix UI jsdom limitations.
 *   - AppSwitch is mocked as a <button role="switch"> to enable disabled assertions.
 *   - AppLabel is mocked as a plain <label>.
 *   - AppInput / AppSlider are mocked as plain <input> elements.
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ---------------------------------------------------------------------------
// Mocks — must come before the component import
// ---------------------------------------------------------------------------

// Mock react-i18next so t(key) returns the key itself
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: jest.fn() }
  }),
  initReactI18next: { type: '3rdParty', init: jest.fn() }
}))

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

  AppSelectTrigger: ({ children }: { children?: React.ReactNode }) =>
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

// Import after mocks are registered
import { PersonalitySettingsPanel, type InferenceSettings } from '../../../../src/renderer/src/components/personality/PersonalitySettingsSheet'

// ---------------------------------------------------------------------------
// i18n key constants — must match what the component passes to t()
// ---------------------------------------------------------------------------

const I18N = {
  title: 'inferenceSettings.title',
  provider: 'inferenceSettings.provider',
  model: 'inferenceSettings.model',
  creativityLevel: 'inferenceSettings.creativityLevel',
  textLength: 'inferenceSettings.textLength',
  reasoning: 'inferenceSettings.reasoning',
  notSupportedReasoning: 'inferenceSettings.notSupportedReasoning'
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Settings — OpenAI + gpt-4o (a non-reasoning model).
 * temperature=0.5 → 'balanced' preset, so no custom slider is shown.
 * maxTokens=1000 → 'medium' preset, so no custom input is shown.
 */
const DEFAULT_SETTINGS: InferenceSettings = {
  providerId: 'openai',
  modelId: 'gpt-4o',
  temperature: 0.5,
  maxTokens: 1000,
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
 * Find the <select> sibling of a label whose text matches the i18n key.
 * Works because AppLabel is mocked as <label> and AppSelect as <select>
 * inside the same parent <div class="space-y-1.5">.
 */
function getSelectByLabelKey(i18nKey: string): HTMLSelectElement {
  const label = screen.getByText(i18nKey)
  const parent = label.parentElement!
  const select = parent.querySelector('select')
  if (!select) {
    throw new Error(`No <select> found under label with key "${i18nKey}"`)
  }
  return select as HTMLSelectElement
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PersonalitySettingsPanel', () => {
  describe('section header', () => {
    it('should render the Inference Settings heading (via i18n key)', () => {
      renderPanel()
      // t('inferenceSettings.title') returns the key itself in our mock
      expect(screen.getByText(I18N.title)).toBeInTheDocument()
    })
  })

  describe('Provider select', () => {
    it('should always be enabled regardless of current selection', () => {
      renderPanel(NO_PROVIDER_SETTINGS)
      const providerSelect = getSelectByLabelKey(I18N.provider)
      expect(providerSelect).not.toBeDisabled()
    })

    it('should reflect the current providerId via data-value attribute', () => {
      renderPanel(DEFAULT_SETTINGS)
      const providerSelect = getSelectByLabelKey(I18N.provider)
      expect(providerSelect.getAttribute('data-value')).toBe('openai')
    })

    it('should render options for all known providers', () => {
      renderPanel(DEFAULT_SETTINGS)
      expect(screen.getByText('OpenAI')).toBeInTheDocument()
      expect(screen.getByText('Anthropic')).toBeInTheDocument()
      expect(screen.getByText('Google')).toBeInTheDocument()
    })
  })

  describe('Model select — disabled state', () => {
    it('should be disabled when no provider is selected', () => {
      // Arrange — empty providerId means no provider found in aiProviders
      renderPanel(NO_PROVIDER_SETTINGS)
      const modelSelect = getSelectByLabelKey(I18N.model)
      expect(modelSelect).toBeDisabled()
    })

    it('should be enabled when a valid provider is selected', () => {
      renderPanel(DEFAULT_SETTINGS)
      const modelSelect = getSelectByLabelKey(I18N.model)
      expect(modelSelect).not.toBeDisabled()
    })

    it('should reflect the current modelId via data-value attribute', () => {
      renderPanel(DEFAULT_SETTINGS)
      const modelSelect = getSelectByLabelKey(I18N.model)
      expect(modelSelect.getAttribute('data-value')).toBe('gpt-4o')
    })
  })

  describe('Creativity Level select — disabled state', () => {
    it('should be disabled when no model is found for the current provider', () => {
      // Arrange — provider is set but modelId does not belong to that provider
      renderPanel(NO_MODEL_SETTINGS)
      const creativitySelect = getSelectByLabelKey(I18N.creativityLevel)
      expect(creativitySelect).toBeDisabled()
    })

    it('should be disabled when no provider is selected at all', () => {
      renderPanel(NO_PROVIDER_SETTINGS)
      const creativitySelect = getSelectByLabelKey(I18N.creativityLevel)
      expect(creativitySelect).toBeDisabled()
    })

    it('should be disabled for reasoning models (temperature not supported)', () => {
      // o1 is a reasoning model — creativity level is not applicable
      renderPanel(REASONING_MODEL_SETTINGS)
      const creativitySelect = getSelectByLabelKey(I18N.creativityLevel)
      expect(creativitySelect).toBeDisabled()
    })

    it('should be enabled when provider and non-reasoning model are both selected', () => {
      renderPanel(DEFAULT_SETTINGS)
      const creativitySelect = getSelectByLabelKey(I18N.creativityLevel)
      expect(creativitySelect).not.toBeDisabled()
    })

    it('should show a note about reasoning models when a reasoning model is active', () => {
      renderPanel(REASONING_MODEL_SETTINGS)
      expect(screen.getByText(I18N.notSupportedReasoning)).toBeInTheDocument()
    })

    it('should NOT show the reasoning model note for non-reasoning models', () => {
      renderPanel(DEFAULT_SETTINGS)
      expect(screen.queryByText(I18N.notSupportedReasoning)).not.toBeInTheDocument()
    })
  })

  describe('Text Length select — disabled state', () => {
    it('should be disabled when no model is found for the current provider', () => {
      renderPanel(NO_MODEL_SETTINGS)
      const textLengthSelect = getSelectByLabelKey(I18N.textLength)
      expect(textLengthSelect).toBeDisabled()
    })

    it('should be disabled when no provider is selected', () => {
      renderPanel(NO_PROVIDER_SETTINGS)
      const textLengthSelect = getSelectByLabelKey(I18N.textLength)
      expect(textLengthSelect).toBeDisabled()
    })

    it('should be enabled when provider and model are both valid', () => {
      renderPanel(DEFAULT_SETTINGS)
      const textLengthSelect = getSelectByLabelKey(I18N.textLength)
      expect(textLengthSelect).not.toBeDisabled()
    })

    it('should be enabled for reasoning models (maxTokens is still configurable)', () => {
      // Text Length is gated on hasModel only, not on modelIsReasoning
      renderPanel(REASONING_MODEL_SETTINGS)
      const textLengthSelect = getSelectByLabelKey(I18N.textLength)
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

    it('should reflect reasoning=false via aria-checked=false', () => {
      renderPanel({ ...REASONING_MODEL_SETTINGS, reasoning: false })
      expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false')
    })

    it('should reflect reasoning=true via aria-checked=true', () => {
      renderPanel({ ...REASONING_MODEL_SETTINGS, reasoning: true })
      expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
    })
  })

  describe('all controls with valid provider + non-reasoning model', () => {
    it('Provider is enabled', () => {
      renderPanel(DEFAULT_SETTINGS)
      expect(getSelectByLabelKey(I18N.provider)).not.toBeDisabled()
    })

    it('Model is enabled', () => {
      renderPanel(DEFAULT_SETTINGS)
      expect(getSelectByLabelKey(I18N.model)).not.toBeDisabled()
    })

    it('Creativity Level is enabled', () => {
      renderPanel(DEFAULT_SETTINGS)
      expect(getSelectByLabelKey(I18N.creativityLevel)).not.toBeDisabled()
    })

    it('Text Length is enabled', () => {
      renderPanel(DEFAULT_SETTINGS)
      expect(getSelectByLabelKey(I18N.textLength)).not.toBeDisabled()
    })

    it('Reasoning is disabled for non-reasoning models even when all other controls work', () => {
      // Reasoning is only meaningful for reasoning models
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

      // Act — change provider to anthropic via the mock <select>
      const providerSelect = getSelectByLabelKey(I18N.provider)
      await user.selectOptions(providerSelect, 'anthropic')

      // Assert — claude-opus-4-6 is the first model in anthropic's list
      expect(onSettingsChange).toHaveBeenCalledWith(
        expect.objectContaining({
          providerId: 'anthropic',
          modelId: 'claude-opus-4-6'
        })
      )
    })

    it('should reset reasoning to false when switching to a provider whose default model is non-reasoning', async () => {
      // Arrange — start with openai/o1 (reasoning model, reasoning: true)
      const settings: InferenceSettings = { ...REASONING_MODEL_SETTINGS, reasoning: true }
      const onSettingsChange = jest.fn()
      const user = userEvent.setup()
      renderPanel(settings, onSettingsChange)

      // Act — switch to Google (default model is gemini-2-0-flash, not a reasoning model)
      const providerSelect = getSelectByLabelKey(I18N.provider)
      await user.selectOptions(providerSelect, 'google')

      // Assert — reasoning reset to false
      expect(onSettingsChange).toHaveBeenCalledWith(
        expect.objectContaining({ reasoning: false })
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
      const modelSelect = getSelectByLabelKey(I18N.model)
      await user.selectOptions(modelSelect, 'gpt-4o-mini')

      // Assert
      expect(onSettingsChange).toHaveBeenCalledWith(
        expect.objectContaining({ modelId: 'gpt-4o-mini' })
      )
    })

    it('should set reasoning=false when switching to a non-reasoning model', async () => {
      // Arrange — start with o1 + reasoning: true
      const settings: InferenceSettings = { ...REASONING_MODEL_SETTINGS, reasoning: true }
      const onSettingsChange = jest.fn()
      const user = userEvent.setup()
      renderPanel(settings, onSettingsChange)

      // Act — switch to gpt-4o (non-reasoning)
      const modelSelect = getSelectByLabelKey(I18N.model)
      await user.selectOptions(modelSelect, 'gpt-4o')

      // Assert — reasoning reset to false
      expect(onSettingsChange).toHaveBeenCalledWith(
        expect.objectContaining({ modelId: 'gpt-4o', reasoning: false })
      )
    })

    it('should preserve reasoning=true when switching to another reasoning model', async () => {
      // Arrange — start with o1 + reasoning: true
      const settings: InferenceSettings = { ...REASONING_MODEL_SETTINGS, reasoning: true }
      const onSettingsChange = jest.fn()
      const user = userEvent.setup()
      renderPanel(settings, onSettingsChange)

      // Act — switch to o3-mini (also a reasoning model)
      const modelSelect = getSelectByLabelKey(I18N.model)
      await user.selectOptions(modelSelect, 'o3-mini')

      // Assert — reasoning remains true
      expect(onSettingsChange).toHaveBeenCalledWith(
        expect.objectContaining({ modelId: 'o3-mini', reasoning: true })
      )
    })
  })

  describe('creativity level change callback', () => {
    it('should call onSettingsChange with temperature=0.2 for the "precise" preset', async () => {
      // Arrange
      const onSettingsChange = jest.fn()
      const user = userEvent.setup()
      renderPanel(DEFAULT_SETTINGS, onSettingsChange)

      // Act
      const creativitySelect = getSelectByLabelKey(I18N.creativityLevel)
      await user.selectOptions(creativitySelect, 'precise')

      // Assert — 'precise' preset maps to temperature 0.2
      expect(onSettingsChange).toHaveBeenCalledWith(
        expect.objectContaining({ temperature: 0.2 })
      )
    })

    it('should call onSettingsChange with temperature=0.8 for the "creative" preset', async () => {
      // Arrange
      const onSettingsChange = jest.fn()
      const user = userEvent.setup()
      renderPanel(DEFAULT_SETTINGS, onSettingsChange)

      // Act
      const creativitySelect = getSelectByLabelKey(I18N.creativityLevel)
      await user.selectOptions(creativitySelect, 'creative')

      // Assert — 'creative' preset maps to temperature 0.8
      expect(onSettingsChange).toHaveBeenCalledWith(
        expect.objectContaining({ temperature: 0.8 })
      )
    })

    it('should NOT call onSettingsChange when "custom" is selected', async () => {
      // 'custom' has temperature=null — the component skips the onSettingsChange call
      const onSettingsChange = jest.fn()
      const user = userEvent.setup()
      renderPanel(DEFAULT_SETTINGS, onSettingsChange)

      // Act
      const creativitySelect = getSelectByLabelKey(I18N.creativityLevel)
      await user.selectOptions(creativitySelect, 'custom')

      // Assert — no temperature change dispatched for custom selection
      expect(onSettingsChange).not.toHaveBeenCalled()
    })
  })

  describe('text length change callback', () => {
    it('should call onSettingsChange with maxTokens=500 for the "short" preset', async () => {
      // Arrange
      const onSettingsChange = jest.fn()
      const user = userEvent.setup()
      renderPanel(DEFAULT_SETTINGS, onSettingsChange)

      // Act
      const textLengthSelect = getSelectByLabelKey(I18N.textLength)
      await user.selectOptions(textLengthSelect, 'short')

      // Assert — 'short' maps to maxTokens 500
      expect(onSettingsChange).toHaveBeenCalledWith(
        expect.objectContaining({ maxTokens: 500 })
      )
    })

    it('should call onSettingsChange with maxTokens=null for the "unlimited" preset', async () => {
      // Arrange
      const onSettingsChange = jest.fn()
      const user = userEvent.setup()
      renderPanel(DEFAULT_SETTINGS, onSettingsChange)

      // Act
      const textLengthSelect = getSelectByLabelKey(I18N.textLength)
      await user.selectOptions(textLengthSelect, 'unlimited')

      // Assert — 'unlimited' maps to maxTokens null
      expect(onSettingsChange).toHaveBeenCalledWith(
        expect.objectContaining({ maxTokens: null })
      )
    })

    it('should call onSettingsChange with maxTokens=4000 for the "very-long" preset', async () => {
      // Arrange
      const onSettingsChange = jest.fn()
      const user = userEvent.setup()
      renderPanel(DEFAULT_SETTINGS, onSettingsChange)

      // Act
      const textLengthSelect = getSelectByLabelKey(I18N.textLength)
      await user.selectOptions(textLengthSelect, 'very-long')

      // Assert — 'very-long' maps to maxTokens 4000
      expect(onSettingsChange).toHaveBeenCalledWith(
        expect.objectContaining({ maxTokens: 4000 })
      )
    })
  })

  describe('reasoning toggle callback', () => {
    it('should call onSettingsChange with reasoning=true when toggled on', async () => {
      // Arrange — reasoning model with reasoning: false
      const settings: InferenceSettings = { ...REASONING_MODEL_SETTINGS, reasoning: false }
      const onSettingsChange = jest.fn()
      const user = userEvent.setup()
      renderPanel(settings, onSettingsChange)

      // Act — click the switch (it is enabled because o1 is a reasoning model)
      const reasoningSwitch = screen.getByRole('switch')
      await user.click(reasoningSwitch)

      // Assert
      expect(onSettingsChange).toHaveBeenCalledWith(
        expect.objectContaining({ reasoning: true })
      )
    })

    it('should call onSettingsChange with reasoning=false when toggled off', async () => {
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
