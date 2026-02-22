# Parallel Downloads Demo - Implementation Guide

## Overview

This demo showcases the **production-ready parallel task execution system** with a file download implementation. It demonstrates:

- ✅ **Parallel downloads** - Download 2+ files simultaneously
- ✅ **Real-time progress tracking** - Speed, ETA, progress bars
- ✅ **Individual cancellation** - Cancel any download mid-flight
- ✅ **Debug instrumentation** - Comprehensive logging and diagnostics
- ✅ **System downloads folder** - Automatic save location
- ✅ **Security hardening** - URL validation, SSRF protection
- ✅ **Retry logic** - Exponential backoff on failures
- ✅ **Filename conflict resolution** - Auto-rename duplicates

## Running the Demo

### 1. Start the Application

```bash
npm run dev
```

### 2. Navigate to the Downloads Demo

Once the app is running, navigate to:

```
#/downloads-demo
```

Or update your navigation menu to include a link to `/downloads-demo`.

### 3. Test Parallel Downloads

The demo provides three action buttons:

1. **Download All** - Downloads both test files simultaneously
2. **Download Sample PDF** - Downloads a single PDF file
3. **Download JSON Sample** - Downloads a JSON data file

## Features Demonstrated

### 1. Parallel Execution

Click "Download All" to see both files downloading simultaneously:
- **Concurrent execution** managed by TaskExecutorService (max 5 parallel)
- Each download has its own AbortController for independent cancellation
- Priority queue system (can submit with priority: 'low' | 'normal' | 'high')

### 2. Real-Time Progress

Each active download shows:
- **Progress bar** (0-100%)
- **Download speed** (MB/s)
- **ETA** (estimated time to completion)
- **Bytes downloaded** / Total bytes
- **Status** (queued → running → completed/error/cancelled)

### 3. Debug Console

The debug console at the bottom shows:
- Task submission events
- State transitions (queued → running → completed)
- Speed calculations
- Completion diagnostics

### 4. Completion Diagnostics

When a download completes, you'll see:
```
File Path: /Users/you/Downloads/sample-test.pdf
Size: 15.23 KB
Type: application/pdf
Duration: 0.85s
Avg Speed: 17.92 MB/s
⚠️ Renamed: sample-test (1).pdf  [if duplicate existed]
```

### 5. Cancellation

Click the "Cancel" button on any running download:
- Aborts the HTTP request immediately
- Cleans up partial downloads
- Emits 'cancelled' event to UI
- Releases the execution slot for queued tasks

## Architecture

### Main Process Components

```
src/main/tasks/
├── TaskExecutorService.ts      # Orchestrator (concurrency, queue, events)
├── TaskHandlerRegistry.ts      # Handler lookup
├── TaskHandler.ts              # Interface
├── TaskDescriptor.ts           # Types
├── TaskEvents.ts               # Event types
└── handlers/
    └── FileDownloadHandler.ts  # Production download implementation
```

### IPC Layer

```
src/main/ipc/
└── TaskIpc.ts                  # task:submit, task:cancel, task:list
```

### Renderer Components

```
src/renderer/src/
├── hooks/
│   └── useTask.ts              # React hook for task management
└── pages/
    └── DownloadsDemo.tsx       # Demo UI
```

## File Download Implementation

The `FileDownloadHandler` is production-ready with:

### Security Features

✅ **URL Validation** - Only HTTP/HTTPS allowed
✅ **SSRF Protection** - Blocks localhost and private IP ranges
✅ **Path Traversal Prevention** - Sanitizes filenames
✅ **File Type Warnings** - Logs warnings for dangerous extensions

### Network Features

✅ **Electron's net module** - Uses Chromium network stack, respects proxy settings
✅ **Automatic redirects** - Follows 3xx redirects transparently
✅ **Retry logic** - 3 retries with exponential backoff (1s, 2s, 4s)
✅ **Progress throttling** - Updates every 100ms max (prevents IPC overload)

### File System Features

✅ **System downloads folder** - Uses `app.getPath('downloads')` by default
✅ **Disk space checking** - Validates available space before download
✅ **Duplicate handling** - Auto-renames to "file (1).ext", "file (2).ext", etc.
✅ **Partial cleanup** - Deletes incomplete files on error/cancellation

### Monitoring & Debug

✅ **Comprehensive logging** - Console logs at every stage
✅ **Speed calculation** - Real-time MB/s calculation
✅ **ETA estimation** - Based on current speed
✅ **Diagnostics object** - Returned with completion event:

```typescript
{
  url: string
  httpStatus: number
  contentType: string | null
  contentLength: number          // Expected size
  actualSize: number              // Downloaded size
  sizeMatch: boolean              // Verification
  totalDurationMs: number         // Including retries
  downloadDurationMs: number      // Actual transfer time
  averageSpeedBytesPerSec: number
  destDir: string
  conflictResolved: boolean       // Was file renamed?
  originalFileName: string
  resolvedFileName: string
}
```

## Code Examples

### Basic Download (from renderer)

```typescript
import { useTask } from '@/hooks/useTask'

function MyComponent() {
  const { submitTask, cancelTask, tasks } = useTask()

  const handleDownload = async () => {
    const taskId = await submitTask('file-download', {
      url: 'https://example.com/file.pdf',
      fileName: 'my-file.pdf'
      // destDir is optional - defaults to Downloads folder
    }, {
      priority: 'high',
      timeoutMs: 30000  // 30 second timeout
    })

    console.log('Download started:', taskId)
  }

  const handleCancel = async (taskId: string) => {
    await cancelTask(taskId)
  }

  return (
    <div>
      <button onClick={handleDownload}>Download</button>

      {Array.from(tasks.values()).map(task => (
        <div key={task.taskId}>
          Status: {task.status}
          Progress: {task.progress}%
          <button onClick={() => handleCancel(task.taskId)}>Cancel</button>
        </div>
      ))}
    </div>
  )
}
```

### Listening to Task Events

```typescript
import { useEffect } from 'react'

useEffect(() => {
  const unsub = window.api.task.onEvent((event) => {
    switch (event.type) {
      case 'started':
        console.log('Download started:', event.data.taskId)
        break
      case 'progress':
        console.log('Progress:', event.data.percent, '%')
        console.log('Speed:', event.data.detail?.speed)
        console.log('ETA:', event.data.detail?.eta)
        break
      case 'completed':
        console.log('Download complete:', event.data.result)
        break
      case 'error':
        console.error('Download failed:', event.data.message)
        break
      case 'cancelled':
        console.log('Download cancelled:', event.data.taskId)
        break
    }
  })

  return unsub
}, [])
```

### Parallel Downloads

```typescript
// Download 5 files in parallel (automatically managed)
const downloads = [
  'https://example.com/file1.pdf',
  'https://example.com/file2.zip',
  'https://example.com/file3.tar.gz',
  'https://example.com/file4.mp4',
  'https://example.com/file5.iso'
]

const taskIds = await Promise.all(
  downloads.map(url =>
    submitTask('file-download', { url })
  )
)

// TaskExecutorService will run 5 concurrently
// If you submit more, they'll queue automatically
```

## Debugging Tips

### 1. Check Main Process Logs

```bash
npm run dev
```

Look for `[FileDownloadHandler]` entries in the console:

```
[FileDownloadHandler] Starting download: https://...
[FileDownloadHandler] Destination: /Users/you/Downloads/file.pdf
[FileDownloadHandler] HTTP 200 - OK
[FileDownloadHandler] Content-Length: 15234 bytes
[FileDownloadHandler] Content-Type: application/pdf
[FileDownloadHandler] ✓ Download complete: 15.23 KB in 0.85s
[FileDownloadHandler] Average speed: 17.92 MB/s
```

### 2. Monitor Task Events

Open the demo page and watch the Debug Console at the bottom for real-time event flow.

### 3. Check Downloaded Files

Files are saved to your system Downloads folder:

**macOS:** `~/Downloads/`
**Windows:** `C:\Users\YourName\Downloads\`
**Linux:** `~/Downloads/`

### 4. Test Error Scenarios

Try these to see error handling:

```typescript
// Invalid URL
submitTask('file-download', { url: 'not-a-url' })
// Error: Invalid URL

// SSRF attempt
submitTask('file-download', { url: 'http://localhost/secret' })
// Error: Downloads from private networks are not allowed

// Network error
submitTask('file-download', { url: 'https://nonexistent-domain-12345.com/file.pdf' })
// Will retry 3 times, then fail
```

## Performance Characteristics

### Concurrency

- **Default max concurrent tasks:** 5
- **Configurable** in bootstrap.ts:
  ```typescript
  new TaskExecutorService(registry, eventBus, 10) // 10 concurrent
  ```

### Progress Update Frequency

- **Throttled to 100ms** (10 updates/second max)
- Prevents IPC channel saturation on fast connections

### Memory Efficiency

- **Streaming downloads** - No full file buffering
- **Incremental write** - Data written to disk as it arrives
- **Cleanup on error** - Partial files deleted immediately

### Network Efficiency

- **Respects proxy settings** - Uses Electron's net module
- **Modern protocols** - HTTP/2, QUIC support
- **Automatic redirects** - No manual handling needed

## Future Enhancements

The architecture supports these additions without changes to the core:

1. **Download resumption** - Partial download recovery via Range headers
2. **Bandwidth limiting** - Throttle download speed
3. **Category-based concurrency** - Different limits for different task types
4. **Persistent queue** - Survive app restarts
5. **Download queue management** - Pause/resume all, clear completed
6. **More task types** - API calls, background processing, etc.

## Testing Checklist

- [ ] Download 2 files simultaneously
- [ ] Check progress bars update smoothly
- [ ] Verify speed and ETA calculations
- [ ] Cancel a download mid-flight
- [ ] Download same file twice (check auto-rename)
- [ ] Check files in Downloads folder
- [ ] Review debug console logs
- [ ] Verify completion diagnostics
- [ ] Test with slow network (throttle in DevTools)
- [ ] Test error handling (invalid URL)

## Troubleshooting

### Downloads not starting

1. Check browser console for errors
2. Verify task IPC is registered in bootstrap.ts
3. Check main process logs for handler errors

### Progress not updating

1. Verify `window.api.task.onEvent` is defined
2. Check event listener is subscribed
3. Look for throttling (updates limited to 100ms intervals)

### Files not in Downloads folder

1. Check `app.getPath('downloads')` returns correct path
2. Verify file permissions
3. Look for errors in main process console

### TypeScript errors

Run typecheck to verify:
```bash
npm run typecheck
```

All types should pass cleanly.

---

## Summary

This implementation provides a **production-ready foundation** for background task execution in your Electron app. The download handler demonstrates best practices for:

- Network operations with Electron's net module
- Real-time progress reporting via IPC
- Concurrent execution management
- Error handling and retry logic
- Security hardening
- User experience (progress, cancellation, diagnostics)

The same `TaskExecutorService` can be extended with new handlers for any background operation (API calls, data processing, exports, etc.) while maintaining the same patterns and reliability.

**Happy downloading! 🚀**
