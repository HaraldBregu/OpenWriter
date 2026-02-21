/**
 * Tests for ipc-helpers utilities.
 * Provides safe wrappers around IPC calls with standardized error handling.
 */

import {
  safeIpcCall,
  safeIpcCallWithHandler,
  isIpcSuccess,
  isIpcError
} from '../../../../src/renderer/src/utils/ipc-helpers'
import type { IpcResult } from '../../../../src/main/ipc/IpcErrorHandler'

describe('ipc-helpers', () => {
  describe('safeIpcCall', () => {
    it('should unwrap successful IPC result', async () => {
      const successResult: IpcResult<string> = {
        success: true,
        data: 'test-data'
      }

      const result = await safeIpcCall(Promise.resolve(successResult))

      expect(result).toBe('test-data')
    })

    it('should throw error for failed IPC result', async () => {
      const errorResult: IpcResult<string> = {
        success: false,
        error: {
          code: 'TEST_ERROR',
          message: 'Test error message'
        }
      }

      await expect(safeIpcCall(Promise.resolve(errorResult))).rejects.toThrow(
        'Test error message'
      )
    })

    it('should handle complex data types', async () => {
      interface ComplexData {
        id: number
        name: string
        nested: { value: boolean }
      }

      const successResult: IpcResult<ComplexData> = {
        success: true,
        data: {
          id: 123,
          name: 'test',
          nested: { value: true }
        }
      }

      const result = await safeIpcCall(Promise.resolve(successResult))

      expect(result).toEqual({
        id: 123,
        name: 'test',
        nested: { value: true }
      })
    })

    it('should propagate promise rejection', async () => {
      const promise = Promise.reject(new Error('Network error'))

      await expect(safeIpcCall(promise)).rejects.toThrow('Network error')
    })
  })

  describe('safeIpcCallWithHandler', () => {
    it('should unwrap successful IPC result', async () => {
      const successResult: IpcResult<string> = {
        success: true,
        data: 'test-data'
      }

      const onError = jest.fn()

      const result = await safeIpcCallWithHandler(
        Promise.resolve(successResult),
        onError
      )

      expect(result).toBe('test-data')
      expect(onError).not.toHaveBeenCalled()
    })

    it('should call custom error handler on failure', async () => {
      const errorResult: IpcResult<string> = {
        success: false,
        error: {
          code: 'TEST_ERROR',
          message: 'Test error message'
        }
      }

      const onError = jest.fn((error) => `Handled: ${error.message}`)

      const result = await safeIpcCallWithHandler(
        Promise.resolve(errorResult),
        onError
      )

      expect(onError).toHaveBeenCalledWith({
        code: 'TEST_ERROR',
        message: 'Test error message'
      })
      expect(result).toBe('Handled: Test error message')
    })

    it('should allow error handler to return different type', async () => {
      const errorResult: IpcResult<number> = {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Item not found'
        }
      }

      const onError = () => null

      const result = await safeIpcCallWithHandler(
        Promise.resolve(errorResult),
        onError
      )

      expect(result).toBeNull()
    })

    it('should allow error handler to return fallback value', async () => {
      const errorResult: IpcResult<string[]> = {
        success: false,
        error: {
          code: 'LOAD_ERROR',
          message: 'Failed to load items'
        }
      }

      const onError = () => []

      const result = await safeIpcCallWithHandler(
        Promise.resolve(errorResult),
        onError
      )

      expect(result).toEqual([])
    })

    it('should pass error code and message to handler', async () => {
      const errorResult: IpcResult<void> = {
        success: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: 'Access denied'
        }
      }

      let capturedError: { code: string; message: string } | null = null

      await safeIpcCallWithHandler(Promise.resolve(errorResult), (error) => {
        capturedError = error
        return undefined
      })

      expect(capturedError).toEqual({
        code: 'PERMISSION_DENIED',
        message: 'Access denied'
      })
    })
  })

  describe('isIpcSuccess', () => {
    it('should return true for successful result', () => {
      const result: IpcResult<string> = {
        success: true,
        data: 'test'
      }

      expect(isIpcSuccess(result)).toBe(true)

      // Type guard should narrow the type
      if (isIpcSuccess(result)) {
        // This should compile without error
        const data: string = result.data
        expect(data).toBe('test')
      }
    })

    it('should return false for error result', () => {
      const result: IpcResult<string> = {
        success: false,
        error: {
          code: 'ERROR',
          message: 'Error message'
        }
      }

      expect(isIpcSuccess(result)).toBe(false)
    })

    it('should work with different data types', () => {
      const numberResult: IpcResult<number> = {
        success: true,
        data: 42
      }

      expect(isIpcSuccess(numberResult)).toBe(true)

      const objectResult: IpcResult<{ key: string }> = {
        success: true,
        data: { key: 'value' }
      }

      expect(isIpcSuccess(objectResult)).toBe(true)
    })
  })

  describe('isIpcError', () => {
    it('should return true for error result', () => {
      const result: IpcResult<string> = {
        success: false,
        error: {
          code: 'ERROR',
          message: 'Error message'
        }
      }

      expect(isIpcError(result)).toBe(true)

      // Type guard should narrow the type
      if (isIpcError(result)) {
        // This should compile without error
        const code: string = result.error.code
        const message: string = result.error.message
        expect(code).toBe('ERROR')
        expect(message).toBe('Error message')
      }
    })

    it('should return false for successful result', () => {
      const result: IpcResult<string> = {
        success: true,
        data: 'test'
      }

      expect(isIpcError(result)).toBe(false)
    })

    it('should work with different data types', () => {
      const numberError: IpcResult<number> = {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid number'
        }
      }

      expect(isIpcError(numberError)).toBe(true)

      const objectError: IpcResult<{ key: string }> = {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Object not found'
        }
      }

      expect(isIpcError(objectError)).toBe(true)
    })
  })

  describe('type guards work together', () => {
    it('should allow exhaustive checking with if-else', () => {
      const result: IpcResult<string> = {
        success: true,
        data: 'test'
      }

      let value: string
      let errorMessage: string

      if (isIpcSuccess(result)) {
        value = result.data
      } else if (isIpcError(result)) {
        errorMessage = result.error.message
      }

      expect(value!).toBe('test')
    })

    it('should be mutually exclusive', () => {
      const successResult: IpcResult<string> = {
        success: true,
        data: 'test'
      }

      expect(isIpcSuccess(successResult)).toBe(true)
      expect(isIpcError(successResult)).toBe(false)

      const errorResult: IpcResult<string> = {
        success: false,
        error: {
          code: 'ERROR',
          message: 'Error'
        }
      }

      expect(isIpcSuccess(errorResult)).toBe(false)
      expect(isIpcError(errorResult)).toBe(true)
    })
  })
})
