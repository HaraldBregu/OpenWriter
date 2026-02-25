# Component Testing Patterns

## PersonalitySettingsPanel / Radix UI components + i18n

The component uses both `useTranslation()` (react-i18next) and Radix UI primitives.
Two mocking layers are required:

### 1. Mock react-i18next so t(key) returns the key itself
```typescript
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: jest.fn() }
  }),
  initReactI18next: { type: '3rdParty', init: jest.fn() }
}))
```
After mocking, find elements by their i18n key: `screen.getByText('inferenceSettings.provider')`.

### 2. Mock AppSelect as a native <select>
```typescript
jest.mock('@/components/app/AppSelect', () => ({
  AppSelect: ({ children, value, onValueChange, disabled }) =>
    React.createElement('select', {
      'data-value': value,
      disabled: disabled ?? false,
      onChange: (e) => onValueChange?.(e.target.value)
    }, children),
  AppSelectTrigger: ({ children }) => React.createElement(React.Fragment, null, children),
  AppSelectValue: () => React.createElement(React.Fragment, null),
  AppSelectContent: ({ children }) => React.createElement(React.Fragment, null, children),
  AppSelectItem: ({ value, children }) => React.createElement('option', { value }, children)
}))
```

### 3. Mock AppSwitch as <button role="switch">
```typescript
jest.mock('@/components/app/AppSwitch', () => ({
  AppSwitch: ({ checked, onCheckedChange, disabled }) =>
    React.createElement('button', {
      role: 'switch',
      'aria-checked': checked,
      disabled: disabled ?? false,
      onClick: () => onCheckedChange?.(!checked)
    })
}))
```

### 4. Finding the correct <select> by label key
```typescript
function getSelectByLabelKey(i18nKey: string): HTMLSelectElement {
  const label = screen.getByText(i18nKey)
  const parent = label.parentElement!
  const select = parent.querySelector('select')
  return select as HTMLSelectElement
}
```

### 5. DEFAULT_SETTINGS — avoid the custom preset trap
The initial settings must map to a known preset, otherwise the custom input/slider
appears and clutters the DOM. Use:
- temperature=0.5 → 'balanced' preset (no slider shown)
- maxTokens=1000 → 'medium' preset (no custom input shown)

### Key disabled logic (PersonalitySettingsPanel)
- Model select: disabled when `!hasProvider`
- Creativity Level: disabled when `!hasModel || modelIsReasoning`
- Text Length: disabled when `!hasModel`
- Reasoning toggle: disabled when `!hasModel || !modelIsReasoning`

### Reasoning model detection
`isReasoningModel(modelId)` checks against prefixes: `['o1', 'o3', 'o3-mini', 'o1-mini', 'o1-preview']`
- `'o1'` → reasoning model
- `'gpt-4o'` → NOT a reasoning model
- `'claude-opus-4-6'` → NOT a reasoning model

## Pre-existing test failures (do not investigate)
- `tests/unit/renderer/store/brainFilesSlice.test.ts` — 10 failures (slice renamed, test out of sync)
- `tests/unit/renderer/hooks/usePostsLoader.test.ts` — 1 failure
- `tests/unit/renderer/pages/WelcomePage.test.tsx` — 8 failures
- Main process: ~12 pre-existing failures in pipeline agent tests
