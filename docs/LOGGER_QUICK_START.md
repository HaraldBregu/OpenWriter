# Logger Service - Quick Start Guide

## What is it?

The LoggerService is a production-ready logging system for the Electron main process that automatically captures all important application events and saves them to daily rotating log files.

## Key Features

- 📁 **Daily Log Files**: Automatically creates new log files each day (e.g., `2026-02-21.log`)
- 🔄 **Auto-Rotation**: Switches to new file at midnight
- 📍 **App Data Storage**: Saves logs in application data folder
- ⚡ **Buffered Writes**: High performance with batched disk writes
- 🎯 **Multiple Levels**: DEBUG, INFO, WARN, ERROR
- 🤖 **Auto-Capture**: Automatically logs Electron events (window, app, errors)
- 🧹 **Auto-Cleanup**: Removes old logs after 30 days (configurable)

## Where Are Logs Stored?

Logs are stored in the application data directory:
- **macOS**: `~/Library/Application Support/Tesseract AI/logs/`
- **Windows**: `%APPDATA%\Tesseract AI\logs\`
- **Linux**: `~/.config/Tesseract AI/logs/`

Example log files:
```
2026-02-21.log
2026-02-22.log
...
```

## How to Use

### 1. Get the Logger

In any service or module:

```typescript
import type { LoggerService } from './services/logger'

// Get logger from container
const logger = container.get<LoggerService>('logger')
```

### 2. Start Logging

```typescript
// Different log levels
logger.debug('MyService', 'Detailed info for debugging')
logger.info('MyService', 'Normal operation message')
logger.warn('MyService', 'Warning - unexpected but handled')
logger.error('MyService', 'Error that needs attention')
```

### 3. Add Context with Structured Data

```typescript
// Log with additional data
logger.info('FileService', 'File saved', {
  path: '/path/to/file.txt',
  size: 1024,
  duration: 150
})

// Output: [2026-02-21T10:30:45.123Z] [INFO ] [FileService] File saved {"path":"/path/to/file.txt","size":1024,"duration":150}
```

### 4. Log Errors with Stack Traces

```typescript
try {
  await riskyOperation()
} catch (error) {
  logger.error('MyService', 'Operation failed', {
    message: error.message,
    stack: error.stack,
    context: 'additional context'
  })
  throw error
}
```

## Complete Example: Integrating Logger into a Service

```typescript
import type { ServiceContainer, Disposable } from '../core/ServiceContainer'
import type { LoggerService } from './logger'

export class MyNewService implements Disposable {
  private readonly logger: LoggerService

  constructor(container: ServiceContainer) {
    // Get logger from container
    this.logger = container.get<LoggerService>('logger')

    // Log initialization
    this.logger.info('MyNewService', 'Service initialized')
  }

  async doSomething(data: string): Promise<void> {
    // Log start of operation (DEBUG level)
    this.logger.debug('MyNewService', 'Starting operation', {
      dataLength: data.length
    })

    try {
      // ... your logic here ...

      // Log success (INFO level)
      this.logger.info('MyNewService', 'Operation completed successfully')

    } catch (error) {
      // Log error with full context (ERROR level)
      this.logger.error('MyNewService', 'Operation failed', {
        error: error.message,
        stack: error.stack,
        data: data.substring(0, 100) // First 100 chars for context
      })
      throw error
    }
  }

  destroy(): void {
    this.logger.info('MyNewService', 'Service destroyed')
  }
}
```

## What Gets Logged Automatically?

The logger automatically captures:

### Application Events
- ✅ App start with version/platform info
- ✅ App quit/exit with exit code
- ✅ All windows closed
- ✅ App activation (macOS)

### Window Events
- ✅ Window created/closed
- ✅ Window focused/blurred
- ✅ Window maximized/minimized
- ✅ Page load success/failure
- ✅ Renderer crashes

### Service Events (via EventBus)
- ✅ Service initialization
- ✅ Workspace changes
- ✅ Agent runs (start/complete/error)
- ✅ Critical errors

### System Events
- ✅ Child process crashes
- ✅ Certificate errors
- ✅ Accessibility changes

## Log Format

Each log line follows this format:

```
[Timestamp] [Level] [Source] Message
```

Example:
```
[2026-02-21T10:30:45.123Z] [INFO ] [App] Application ready {"version":"1.0.0","platform":"darwin"}
[2026-02-21T10:30:46.456Z] [DEBUG] [Window] Window created: ID 1
[2026-02-21T10:30:47.789Z] [WARN ] [FileSystem] File not found: /path/to/file.txt
[2026-02-21T10:30:50.123Z] [ERROR] [Network] Request failed {"status":500}
```

## Log Levels Explained

| Level | When to Use | Example |
|-------|-------------|---------|
| **DEBUG** | Detailed information for troubleshooting | "Processing step 3/10", "Cache hit for key X" |
| **INFO** | Normal operations, important events | "File saved", "User logged in", "Service started" |
| **WARN** | Unexpected but handled situations | "API rate limit approaching", "Retrying operation" |
| **ERROR** | Errors that need attention | "Connection failed", "File not found", "Invalid input" |

## Performance

The logger is designed for minimal performance impact:

- **Buffered Writes**: Logs are batched and written every 5 seconds (configurable)
- **Auto-Flush**: Buffer flushes automatically when full (100 entries) or on rotation
- **Low Memory**: Only ~10-20KB in memory for the buffer
- **Async by Default**: Non-blocking except during shutdown

### Manual Flush

For critical operations, force immediate write:

```typescript
logger.error('CriticalError', 'Something bad happened')
logger.flush() // Write immediately to disk
```

## Best Practices

### ✅ DO

```typescript
// Use specific source names
logger.info('WorkspaceService', 'Workspace loaded')

// Include context
logger.error('FileService', 'Save failed', {
  path: filePath,
  error: error.message,
  stack: error.stack
})

// Use appropriate log levels
logger.debug('Parser', 'Token found', { token })  // Detailed
logger.info('Auth', 'Login successful')           // Important event
logger.warn('API', 'Rate limit: 10 remaining')    // Warning
logger.error('DB', 'Connection lost')             // Error
```

### ❌ DON'T

```typescript
// Don't use generic sources
logger.info('App', 'Something happened')  // Too generic

// Don't log sensitive data
logger.info('Auth', 'Login', {
  password: 'secret',  // NEVER!
  token: 'abc123'      // NEVER!
})

// Don't log minimal information for errors
logger.error('Error', 'Failed')  // Not helpful
```

## Configuration

The logger uses sensible defaults but can be configured:

```typescript
const logger = new LoggerService(eventBus, {
  minLevel: LogLevel.DEBUG,      // Minimum level to log
  maxRetentionDays: 30,           // Keep logs for 30 days
  flushInterval: 5000,            // Flush every 5 seconds
  maxBufferSize: 100,             // Flush at 100 entries
  consoleOutput: true             // Also log to console
})
```

**Defaults:**
- Development: DEBUG level, console output ON
- Production: INFO level, console output OFF

## Viewing Logs

### During Development
Logs appear in both:
1. Console (terminal where you ran `npm run dev`)
2. Log files in the locations above

### In Production
Logs only go to files (no console output)

### Accessing Log Files

Navigate to the log directory and view with any text editor:

```bash
# macOS
open ~/Library/Application\ Support/Tesseract\ AI/logs/

# Windows
explorer %APPDATA%\Tesseract AI\logs

# Linux
xdg-open ~/.config/Tesseract\ AI/logs/

# View today's log (replace with actual date)
cat ~/.config/Tesseract\ AI/logs/2026-02-21.log

# View all logs
ls -la ~/.config/Tesseract\ AI/logs/
```

## Troubleshooting

### Logs Not Appearing

1. **Check log level**: DEBUG logs won't appear in production
2. **Check directory**: Verify log directory exists and is writable
3. **Check console**: In development, logs should appear in console
4. **Force flush**: Call `logger.flush()` to write immediately

### Where Are My Logs?

```typescript
// Get current log file path
const logger = container.get<LoggerService>('logger')
console.log('Log file:', logger.getCurrentLogFile())
console.log('Log directory:', logger.getLogDirectory())
```

### Performance Issues

If logging impacts performance:
1. Increase flush interval: `flushInterval: 10000` (10 seconds)
2. Increase buffer size: `maxBufferSize: 500`
3. Reduce log level: Use INFO instead of DEBUG in production
4. Disable console output in production

## Need More Help?

See full documentation:
- **Full API**: `/Users/haraldbregu/Documents/9Spartans/apps/tesseract-ai/src/main/services/logger.md`
- **Examples**: `/Users/haraldbregu/Documents/9Spartans/apps/tesseract-ai/src/main/services/logger-example.ts`
- **Implementation**: `/Users/haraldbregu/Documents/9Spartans/apps/tesseract-ai/LOGGER_IMPLEMENTATION.md`

## Quick Reference

```typescript
// Get logger
const logger = container.get<LoggerService>('logger')

// Basic logging
logger.debug('Source', 'Debug message')
logger.info('Source', 'Info message')
logger.warn('Source', 'Warning message')
logger.error('Source', 'Error message')

// With data
logger.info('Source', 'Message', { key: 'value' })

// Error logging
catch (error) {
  logger.error('Source', 'Failed', {
    message: error.message,
    stack: error.stack
  })
}

// Force flush
logger.flush()

// Get log location
logger.getCurrentLogFile()
logger.getLogDirectory()
```

That's it! The logger is already running and capturing events. Just use it in your services for custom logging.
