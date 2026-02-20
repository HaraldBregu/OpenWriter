/**
 * Tests for IpcErrorHandler - standardized error wrapping for IPC handlers.
 *
 * wrapIpcHandler and wrapSimpleHandler ensure all IPC responses follow
 * a consistent { success, data/error } format.
 */

import {
  wrapIpcHandler,
  wrapSimpleHandler,
  type IpcResult
} from '../../../../src/main/ipc/IpcErrorHandler'
import { createMockIpcEvent } from '../../../helpers/test-utils'

describe('IpcErrorHandler', () => {
  describe('wrapIpcHandler', () => {
    it('should return a success result when the handler succeeds', async () => {
      // Arrange
      const handler = jest.fn().mockResolvedValue({ data: 'test' })
      const wrapped = wrapIpcHandler(handler, 'test-handler')
      const event = createMockIpcEvent()

      // Act
      const result = (await wrapped(event as never, 'arg1', 'arg2')) as IpcResult<{
        data: string
      }>

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual({ data: 'test' })
      }
      expect(handler).toHaveBeenCalledWith(event, 'arg1', 'arg2')
    })

    it('should return an error result when the handler throws', async () => {
      // Arrange
      const handler = jest.fn().mockRejectedValue(new Error('something failed'))
      const wrapped = wrapIpcHandler(handler, 'failing-handler')
      const event = createMockIpcEvent()
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      // Act
      const result = await wrapped(event as never)

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toBe('something failed')
        expect(result.error.code).toBe('Error')
      }
      consoleSpy.mockRestore()
    })

    it('should handle non-Error throws by converting to string', async () => {
      // Arrange
      const handler = jest.fn().mockRejectedValue('string error')
      const wrapped = wrapIpcHandler(handler, 'string-error-handler')
      const event = createMockIpcEvent()
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      // Act
      const result = await wrapped(event as never)

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toBe('string error')
      }
      consoleSpy.mockRestore()
    })

    it('should include stack trace only in development', async () => {
      // Arrange
      const originalEnv = process.env.NODE_ENV
      const handler = jest.fn().mockRejectedValue(new Error('dev error'))
      const event = createMockIpcEvent()
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      // Test development mode
      process.env.NODE_ENV = 'development'
      const wrappedDev = wrapIpcHandler(handler, 'dev-handler')
      const devResult = await wrappedDev(event as never)
      if (!devResult.success) {
        expect(devResult.error.stack).toBeDefined()
      }

      // Test production mode
      process.env.NODE_ENV = 'production'
      const wrappedProd = wrapIpcHandler(handler, 'prod-handler')
      const prodResult = await wrappedProd(event as never)
      if (!prodResult.success) {
        expect(prodResult.error.stack).toBeUndefined()
      }

      // Cleanup
      process.env.NODE_ENV = originalEnv
      consoleSpy.mockRestore()
    })
  })

  describe('wrapSimpleHandler', () => {
    it('should wrap a handler that does not take an event parameter', async () => {
      // Arrange
      const handler = jest.fn().mockResolvedValue(42)
      const wrapped = wrapSimpleHandler(handler, 'simple-handler')
      const event = createMockIpcEvent()

      // Act
      const result = await wrapped(event as never)

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe(42)
      }
      expect(handler).toHaveBeenCalled()
    })

    it('should forward arguments (excluding event) to the handler', async () => {
      // Arrange
      const handler = jest.fn().mockResolvedValue('ok')
      const wrapped = wrapSimpleHandler(handler, 'args-handler')
      const event = createMockIpcEvent()

      // Act
      await wrapped(event as never, 'arg1', 'arg2')

      // Assert
      expect(handler).toHaveBeenCalledWith('arg1', 'arg2')
    })
  })
})
