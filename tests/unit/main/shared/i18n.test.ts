/**
 * Tests for i18n loadTranslations function.
 * Validates translation loading from JSON files.
 */

// Mock @electron-toolkit/utils
jest.mock('@electron-toolkit/utils', () => ({
  is: { dev: true }
}))

// Mock node:fs
jest.mock('node:fs', () => ({
  readFileSync: jest.fn().mockReturnValue('{"hello":"World","goodbye":"Farewell"}')
}))

import { loadTranslations } from '../../../../src/main/i18n'
import { readFileSync } from 'node:fs'

describe('loadTranslations', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should read and parse JSON translation file', () => {
    const result = loadTranslations('en', 'menu')
    expect(readFileSync).toHaveBeenCalledWith(
      expect.stringContaining('en'),
      'utf-8'
    )
    expect(result).toEqual({ hello: 'World', goodbye: 'Farewell' })
  })

  it('should construct correct path for given language and component', () => {
    loadTranslations('it', 'tray')
    const calledPath = (readFileSync as jest.Mock).mock.calls[0][0]
    expect(calledPath).toContain('it')
    expect(calledPath).toContain('tray.json')
  })

  it('should throw when translation file is not found', () => {
    ;(readFileSync as jest.Mock).mockImplementationOnce(() => {
      throw new Error('ENOENT: no such file or directory')
    })
    expect(() => loadTranslations('xx', 'missing')).toThrow()
  })
})
