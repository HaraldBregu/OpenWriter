import type { TaskHandler, ProgressReporter, StreamReporter } from './TaskHandler'

export type DemoVariant = 'fast' | 'slow' | 'streaming' | 'error'

export interface DemoTaskInput {
  variant: DemoVariant
}

/**
 * Demo task handler for the debug page.
 * Simulates real task lifecycle events (progress, streaming, errors) without
 * performing any real work. Useful for verifying the task system end-to-end.
 */
export class DemoTaskHandler implements TaskHandler<DemoTaskInput, string> {
  readonly type = 'demo'

  validate(input: DemoTaskInput): void {
    const valid: DemoVariant[] = ['fast', 'slow', 'streaming', 'error']
    if (!valid.includes(input?.variant)) {
      throw new Error(`Invalid demo variant: "${input?.variant}". Must be one of: ${valid.join(', ')}`)
    }
  }

  async execute(
    input: DemoTaskInput,
    signal: AbortSignal,
    reporter: ProgressReporter,
    streamReporter?: StreamReporter,
  ): Promise<string> {
    switch (input.variant) {
      case 'fast':
        return this.runFast(signal, reporter)
      case 'slow':
        return this.runSlow(signal, reporter)
      case 'streaming':
        return this.runStreaming(signal, reporter, streamReporter)
      case 'error':
        return this.runError(signal, reporter)
    }
  }

  // ---------------------------------------------------------------------------
  // Variants
  // ---------------------------------------------------------------------------

  private async runFast(signal: AbortSignal, reporter: ProgressReporter): Promise<string> {
    const steps = [
      [25, 'Initializing…'],
      [50, 'Processing…'],
      [75, 'Finalizing…'],
      [100, 'Done'],
    ] as const

    for (const [pct, msg] of steps) {
      await sleep(300, signal)
      reporter.progress(pct, msg)
    }

    return 'Fast demo task completed'
  }

  private async runSlow(signal: AbortSignal, reporter: ProgressReporter): Promise<string> {
    const steps = 10
    for (let i = 1; i <= steps; i++) {
      await sleep(800, signal)
      reporter.progress(i * 10, `Step ${i} of ${steps}`)
    }
    return 'Slow demo task completed'
  }

  private async runStreaming(
    signal: AbortSignal,
    reporter: ProgressReporter,
    streamReporter?: StreamReporter,
  ): Promise<string> {
    const tokens = [
      'Once', ' upon', ' a', ' time,', ' in', ' a', ' distant', ' galaxy,',
      ' there', ' was', ' a', ' task', ' manager', ' that', ' streamed',
      ' tokens', ' one', ' by', ' one.', ' The', ' end.',
    ]

    reporter.progress(10, 'Starting stream…')

    for (let i = 0; i < tokens.length; i++) {
      await sleep(150, signal)
      streamReporter?.stream(tokens[i])
      reporter.progress(10 + Math.round((i / tokens.length) * 85), 'Streaming…')
    }

    reporter.progress(100, 'Stream complete')
    return tokens.join('')
  }

  private async runError(signal: AbortSignal, reporter: ProgressReporter): Promise<string> {
    reporter.progress(30, 'Working…')
    await sleep(500, signal)
    reporter.progress(60, 'Almost there…')
    await sleep(400, signal)
    throw new Error('Demo error: simulated task failure')
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const timer = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    }, { once: true })
  })
}
