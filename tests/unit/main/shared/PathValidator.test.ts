/**
 * Tests for PathValidator.
 * Validates security path validation to prevent traversal attacks.
 */
import { PathValidator } from '../../../../src/main/shared/PathValidator'
import 'electron'

describe('PathValidator', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('isPathSafe', () => {
    it('should return true for paths within allowed directories', () => {
      // app.getPath('documents') returns '/fake/documents' in our mock
      expect(PathValidator.isPathSafe('/fake/documents/myfile.txt')).toBe(true)
      expect(PathValidator.isPathSafe('/fake/downloads/data.csv')).toBe(true)
      expect(PathValidator.isPathSafe('/fake/desktop/notes.md')).toBe(true)
      expect(PathValidator.isPathSafe('/fake/userData/settings.json')).toBe(true)
    })

    it('should return false for paths outside allowed directories', () => {
      expect(PathValidator.isPathSafe('/etc/passwd')).toBe(false)
      expect(PathValidator.isPathSafe('/root/.ssh/id_rsa')).toBe(false)
      expect(PathValidator.isPathSafe('/tmp/malicious')).toBe(false)
    })

    it('should normalize paths and reject traversal attempts', () => {
      // ../../../etc/passwd should normalize to /etc/passwd which is outside allowed paths
      expect(PathValidator.isPathSafe('/fake/documents/../../../etc/passwd')).toBe(false)
    })

    it('should accept nested paths within allowed directories', () => {
      expect(PathValidator.isPathSafe('/fake/documents/subdir/nested/file.txt')).toBe(true)
    })
  })

  describe('assertPathSafe', () => {
    it('should not throw for safe paths', () => {
      expect(() => PathValidator.assertPathSafe('/fake/documents/safe.txt')).not.toThrow()
    })

    it('should throw for unsafe paths', () => {
      expect(() => PathValidator.assertPathSafe('/etc/passwd')).toThrow(
        'outside allowed directories'
      )
    })

    it('should include the path in the error message', () => {
      expect(() => PathValidator.assertPathSafe('/bad/path')).toThrow('/bad/path')
    })
  })

  describe('getAllowedPaths', () => {
    it('should return all allowed base paths', () => {
      const paths = PathValidator.getAllowedPaths()
      expect(paths).toContain('/fake/documents')
      expect(paths).toContain('/fake/downloads')
      expect(paths).toContain('/fake/desktop')
      expect(paths).toContain('/fake/userData')
    })

    it('should return a copy (not the original array)', () => {
      const paths1 = PathValidator.getAllowedPaths()
      paths1.push('/fake/extra')
      const paths2 = PathValidator.getAllowedPaths()
      expect(paths2).not.toContain('/fake/extra')
    })
  })
})
