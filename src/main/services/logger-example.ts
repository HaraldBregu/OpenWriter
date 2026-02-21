/**
 * Example: Using LoggerService in your own services
 *
 * This file demonstrates various usage patterns for the LoggerService.
 * It is not part of the application - just examples for reference.
 */

import type { ServiceContainer, Disposable } from '../core/ServiceContainer'
import type { LoggerService } from './logger'

// Example 1: Simple service with logging
export class ExampleService implements Disposable {
  private readonly logger: LoggerService

  constructor(container: ServiceContainer) {
    this.logger = container.get<LoggerService>('logger')
    this.logger.info('ExampleService', 'Service initialized')
  }

  async performOperation(data: string): Promise<void> {
    this.logger.debug('ExampleService', 'Starting operation', { dataLength: data.length })

    try {
      // Simulate some work
      await this.processData(data)
      this.logger.info('ExampleService', 'Operation completed successfully')
    } catch (error) {
      this.logger.error('ExampleService', 'Operation failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
      throw error
    }
  }

  private async processData(data: string): Promise<void> {
    // Simulated processing
    await new Promise((resolve) => setTimeout(resolve, 100))
    if (!data) {
      throw new Error('Data is empty')
    }
  }

  destroy(): void {
    this.logger.info('ExampleService', 'Service destroyed')
  }
}

// Example 2: Service with performance logging
export class PerformanceMonitor {
  private readonly logger: LoggerService

  constructor(container: ServiceContainer) {
    this.logger = container.get<LoggerService>('logger')
  }

  async measureOperation<T>(name: string, operation: () => Promise<T>): Promise<T> {
    const startTime = Date.now()
    this.logger.debug('PerformanceMonitor', `Starting ${name}`)

    try {
      const result = await operation()
      const duration = Date.now() - startTime

      this.logger.info('PerformanceMonitor', `${name} completed`, {
        duration,
        success: true
      })

      return result
    } catch (error) {
      const duration = Date.now() - startTime

      this.logger.error('PerformanceMonitor', `${name} failed`, {
        duration,
        error: error instanceof Error ? error.message : String(error)
      })

      throw error
    }
  }
}

// Example 3: IPC handler with logging
export function setupExampleIpc(container: ServiceContainer): void {
  const logger = container.get<LoggerService>('logger')

  // Example IPC handler with logging
  async function handleExampleRequest(args: { id: string; data: string }): Promise<unknown> {
    logger.info('IPC', 'Example request received', {
      id: args.id,
      dataLength: args.data.length
    })

    try {
      // Process request
      const result = await processRequest(args)

      logger.info('IPC', 'Example request completed', {
        id: args.id,
        resultSize: JSON.stringify(result).length
      })

      return result
    } catch (error) {
      logger.error('IPC', 'Example request failed', {
        id: args.id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })

      throw error
    }
  }

  async function processRequest(args: { id: string; data: string }): Promise<unknown> {
    // Simulated request processing
    return { id: args.id, processed: true }
  }

  // You would register this with ipcMain.handle()
}

// Example 4: File operation with logging
export class FileHandler {
  private readonly logger: LoggerService

  constructor(container: ServiceContainer) {
    this.logger = container.get<LoggerService>('logger')
  }

  async saveFile(path: string, content: string): Promise<void> {
    this.logger.debug('FileHandler', 'Saving file', {
      path,
      contentSize: content.length
    })

    try {
      // Simulated file save
      await this.writeToFile(path, content)

      this.logger.info('FileHandler', 'File saved successfully', {
        path,
        size: content.length
      })
    } catch (error) {
      this.logger.error('FileHandler', 'Failed to save file', {
        path,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })

      throw error
    }
  }

  async loadFile(path: string): Promise<string> {
    this.logger.debug('FileHandler', 'Loading file', { path })

    try {
      const content = await this.readFromFile(path)

      this.logger.info('FileHandler', 'File loaded successfully', {
        path,
        size: content.length
      })

      return content
    } catch (error) {
      this.logger.error('FileHandler', 'Failed to load file', {
        path,
        error: error instanceof Error ? error.message : String(error)
      })

      throw error
    }
  }

  private async writeToFile(_path: string, _content: string): Promise<void> {
    // Simulated file write
    await new Promise((resolve) => setTimeout(resolve, 50))
  }

  private async readFromFile(_path: string): Promise<string> {
    // Simulated file read
    await new Promise((resolve) => setTimeout(resolve, 50))
    return 'file content'
  }
}

// Example 5: Logging best practices
export class BestPracticesExample {
  private readonly logger: LoggerService

  constructor(container: ServiceContainer) {
    this.logger = container.get<LoggerService>('logger')
  }

  demonstrateBestPractices(): void {
    // ✅ Good: Specific source name
    this.logger.info('BestPracticesExample', 'Service started')

    // ❌ Bad: Generic source
    // this.logger.info('App', 'Something happened')

    // ✅ Good: Include context in structured data
    this.logger.info('BestPracticesExample', 'User action completed', {
      userId: '12345',
      action: 'document_created',
      timestamp: Date.now()
    })

    // ❌ Bad: Sensitive data in logs
    // this.logger.info('Auth', 'User logged in', {
    //   username: 'john',
    //   password: 'secret123',  // NEVER LOG PASSWORDS!
    //   token: 'abc123xyz'      // NEVER LOG TOKENS!
    // })

    // ✅ Good: Safe information only
    this.logger.info('Auth', 'User logged in', {
      userId: '12345',
      loginTime: Date.now()
    })

    // ✅ Good: Use appropriate log levels
    this.logger.debug('BestPracticesExample', 'Detailed trace information')
    this.logger.info('BestPracticesExample', 'Normal operation')
    this.logger.warn('BestPracticesExample', 'Something unexpected but handled')
    this.logger.error('BestPracticesExample', 'An error that needs attention')

    // ✅ Good: Log errors with full context
    try {
      throw new Error('Example error')
    } catch (error) {
      this.logger.error('BestPracticesExample', 'Operation failed', {
        operation: 'demonstrateBestPractices',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: Date.now()
      })
    }
  }
}

// Example 6: Manual flush for critical operations
export class CriticalOperationHandler {
  private readonly logger: LoggerService

  constructor(container: ServiceContainer) {
    this.logger = container.get<LoggerService>('logger')
  }

  async performCriticalOperation(): Promise<void> {
    // Log critical operation start
    this.logger.error('CriticalOperationHandler', 'Starting critical operation')

    // Force immediate write to disk
    this.logger.flush()

    try {
      // Perform critical operation
      await this.criticalWork()

      this.logger.info('CriticalOperationHandler', 'Critical operation completed')
      this.logger.flush()
    } catch (error) {
      this.logger.error('CriticalOperationHandler', 'Critical operation failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })

      // Ensure error is written immediately
      this.logger.flush()

      throw error
    }
  }

  private async criticalWork(): Promise<void> {
    // Simulated critical work
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
}
