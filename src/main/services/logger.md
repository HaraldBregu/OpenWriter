# LoggerService Documentation

## Overview

The `LoggerService` provides centralized logging for the Electron main process with daily log rotation, buffered writes, and automatic event capture.

## Features

- **Daily Log Rotation**: Automatically creates new log files each day (`YYYY-MM-DD.log`)
- **Buffered Writes**: Batches log entries in memory and flushes periodically for performance
- **Multiple Log Levels**: DEBUG, INFO, WARN, ERROR
- **Workspace-Aware**: Stores logs in workspace directory if available, otherwise in app data
- **EventBus Integration**: Automatically logs important application events
- **Log Retention**: Automatically cleans up old log files based on retention policy
- **Development-Friendly**: Console output in development, file-only in production

## Log Storage Locations

- **With Workspace**: `{workspace}/logs/YYYY-MM-DD.log`
- **Without Workspace**: `{appData}/logs/YYYY-MM-DD.log`

## Usage

### Getting the Logger from ServiceContainer

```typescript
import type { LoggerService } from './services/logger'

// In your service or module
const logger = container.get<LoggerService>('logger')
```

### Basic Logging

```typescript
// Debug level (development only by default)
logger.debug('MyService', 'Detailed debugging information')

// Info level
logger.info('MyService', 'Normal operation message')

// Warning level
logger.warn('MyService', 'Something unexpected but handled')

// Error level
logger.error('MyService', 'An error occurred')
```

### Logging with Additional Data

```typescript
// Log with structured data
logger.info('FileService', 'File saved successfully', {
  path: '/path/to/file.txt',
  size: 1024,
  duration: 150
})

// Log errors with stack traces
try {
  // ... some operation
} catch (error) {
  logger.error('MyService', 'Operation failed', {
    message: error.message,
    stack: error.stack
  })
}
```

## Log Format

Each log entry follows this format:

```
[2026-02-21T10:30:45.123Z] [INFO ] [MyService] Message here
[2026-02-21T10:30:46.456Z] [WARN ] [FileSystem] File not found /path/to/file
[2026-02-21T10:30:47.789Z] [ERROR] [Network] Request failed {"status":500,"url":"https://api.example.com"}
```

Format breakdown:
- `[Timestamp]`: ISO 8601 format (UTC)
- `[Level]`: Log level (DEBUG, INFO, WARN, ERROR)
- `[Source]`: Service or component name
- `Message`: Log message with optional structured data

## Configuration

The logger can be configured with options when instantiated:

```typescript
const logger = new LoggerService(workspaceService, eventBus, {
  minLevel: LogLevel.DEBUG,      // Minimum log level to write
  maxRetentionDays: 30,           // Keep logs for 30 days
  flushInterval: 5000,            // Flush buffer every 5 seconds
  maxBufferSize: 100,             // Flush if buffer reaches 100 entries
  consoleOutput: true             // Also output to console
})
```

### Default Configuration

- **Production**:
  - Min level: `INFO`
  - Console output: `false`
  - Retention: 30 days

- **Development**:
  - Min level: `DEBUG`
  - Console output: `true`
  - Retention: 30 days

## Automatic Event Logging

The logger automatically captures and logs the following events:

### Application Events
- Application ready
- Application quit
- Window creation/closure
- Workspace changes
- Service initialization/destruction
- Critical errors

### Window Events (Debug Level)
- Window show/hide
- Window focus/blur
- Window maximize/minimize
- Page load success/failure
- Renderer crashes

### Process Events
- GPU process crashes
- Renderer process crashes
- Child process termination
- Certificate errors

## Best Practices

### 1. Use Descriptive Sources

```typescript
// Good: Specific service name
logger.info('WorkspaceService', 'Workspace loaded')

// Bad: Generic or missing
logger.info('App', 'Something happened')
```

### 2. Choose Appropriate Log Levels

```typescript
// DEBUG: Detailed information for troubleshooting
logger.debug('AgentService', 'Processing step 3/10', { progress: 30 })

// INFO: Normal operation, important events
logger.info('FileService', 'Document saved', { path, size })

// WARN: Unexpected but handled situations
logger.warn('NetworkService', 'API rate limit approaching', { remaining: 10 })

// ERROR: Errors that need attention
logger.error('Database', 'Connection failed', { error, retries: 3 })
```

### 3. Include Context in Error Logs

```typescript
// Good: Full context
logger.error('FileService', 'Failed to save file', {
  path: filePath,
  error: error.message,
  stack: error.stack,
  timestamp: Date.now()
})

// Bad: Minimal information
logger.error('FileService', 'Error')
```

### 4. Avoid Logging Sensitive Data

```typescript
// Bad: Contains sensitive information
logger.info('Auth', 'User logged in', {
  username: 'john',
  password: 'secret123',  // Never log passwords!
  token: 'abc123xyz'      // Never log tokens!
})

// Good: Safe information only
logger.info('Auth', 'User logged in', {
  userId: '12345',
  timestamp: Date.now()
})
```

### 5. Manual Flush for Critical Sections

```typescript
// Ensure logs are written immediately before critical operation
logger.error('System', 'Critical error detected, initiating shutdown')
logger.flush()  // Force immediate write
app.quit()
```

## Performance Considerations

### Buffering

The logger buffers log entries in memory and flushes them periodically (default: every 5 seconds) or when the buffer is full (default: 100 entries). This minimizes disk I/O and improves performance.

### Automatic Flushing

The buffer is automatically flushed in these situations:
1. Periodically based on `flushInterval`
2. When buffer size reaches `maxBufferSize`
3. When log file rotates (new day)
4. When workspace changes
5. During service shutdown

### Manual Flushing

Force immediate flush when needed:

```typescript
logger.flush()
```

## Troubleshooting

### Logs Not Appearing

1. Check log level configuration (DEBUG logs won't appear in production by default)
2. Verify log directory exists and is writable
3. Check console output in development mode
4. Ensure logger is initialized properly in bootstrap

### Log Directory Issues

If the log directory cannot be created:
- Logger falls back to console output only
- Check file system permissions
- Verify workspace path is valid
- Check available disk space

### Performance Issues

If logging impacts performance:
- Increase `flushInterval` (less frequent disk writes)
- Increase `maxBufferSize` (larger buffer before flush)
- Reduce log level (INFO instead of DEBUG in production)
- Disable console output in production

## Examples

### Service Integration

```typescript
import type { LoggerService } from './services/logger'
import type { ServiceContainer } from '../core/ServiceContainer'

export class MyService {
  private logger: LoggerService

  constructor(container: ServiceContainer) {
    this.logger = container.get<LoggerService>('logger')
    this.logger.info('MyService', 'Service initialized')
  }

  async processData(data: unknown): Promise<void> {
    this.logger.debug('MyService', 'Processing data', {
      size: JSON.stringify(data).length
    })

    try {
      // ... processing logic
      this.logger.info('MyService', 'Data processed successfully')
    } catch (error) {
      this.logger.error('MyService', 'Failed to process data', {
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }
}
```

### IPC Handler with Logging

```typescript
ipcMain.handle('my-operation', async (event, args) => {
  const logger = container.get<LoggerService>('logger')

  logger.info('IPC', 'Operation requested', { args })

  try {
    const result = await performOperation(args)
    logger.info('IPC', 'Operation completed', { result })
    return result
  } catch (error) {
    logger.error('IPC', 'Operation failed', {
      args,
      error: error.message,
      stack: error.stack
    })
    throw error
  }
})
```

## Maintenance

### Log Cleanup

The logger automatically cleans up old log files based on the retention policy (default: 30 days). Set `maxRetentionDays: 0` to disable automatic cleanup.

### Manual Cleanup

To manually clean up logs:

```bash
# Remove logs older than 30 days (macOS/Linux)
find ~/Library/Application\ Support/Tesseract\ AI/logs -name "*.log" -mtime +30 -delete

# Remove logs older than 30 days (Windows PowerShell)
Get-ChildItem "$env:APPDATA\Tesseract AI\logs\*.log" | Where-Object {$_.LastWriteTime -lt (Get-Date).AddDays(-30)} | Remove-Item
```

### Accessing Logs

Log files are stored in:
- **macOS**: `~/Library/Application Support/Tesseract AI/logs/`
- **Windows**: `%APPDATA%\Tesseract AI\logs\`
- **Linux**: `~/.config/Tesseract AI/logs/`

Or in the workspace directory if one is selected:
- `{workspace}/logs/`
