/**
 * DemoTaskHandler — four synthetic variants that exercise every part of the
 * task lifecycle so the debug page has real tasks to inspect.
 *
 * Variants:
 *   fast      — 4 progress steps, finishes in ~1.2 s
 *   slow      — 10 progress steps, finishes in ~8 s
 *   streaming — streams 21 tokens one by one (~3 s total)
 *   error     — progresses to 60 % then throws a simulated failure
 *
 * All variants respect AbortSignal so cancel/pause work correctly mid-run.
 */

import type { TaskHandler, ProgressReporter, StreamReporter } from '../TaskHandler'

export type DemoVariant = 'fast' | 'slow' | 'streaming' | 'error'

export interface DemoTaskInput {
  variant: DemoVariant
}

export class DemoTaskHandler implements TaskHandler<DemoTaskInput, string> {
  readonly type = 'demo'

  validate(input: DemoTaskInput): void {
    const valid: DemoVariant[] = ['fast', 'slow', 'streaming', 'error']
    if (!input?.variant || !valid.includes(input.variant)) {
      throw new Error(
        `Invalid demo variant: "${input?.variant}". Expected one of: ${valid.join(', ')}`,
      )
    }
  }

  execute(
    input: DemoTaskInput,
    signal: AbortSignal,
    reporter: ProgressReporter,
    stream?: StreamReporter,
  ): Promise<string> {
    switch (input.variant) {
      case 'fast':      return this.runFast(signal, reporter)
      case 'slow':      return this.runSlow(signal, reporter)
      case 'streaming': return this.runStreaming(signal, reporter, stream)
      case 'error':     return this.runError(signal, reporter)
    }
  }

  // ---------------------------------------------------------------------------
  // Variants
  // ---------------------------------------------------------------------------

  private async runFast(signal: AbortSignal, reporter: ProgressReporter): Promise<string> {
    await sleep(200, signal); reporter.progress(25, 'Initializing…')
    await sleep(300, signal); reporter.progress(50, 'Processing…')
    await sleep(300, signal); reporter.progress(75, 'Finalizing…')
    await sleep(200, signal); reporter.progress(100, 'Done')
    return 'fast task completed'
  }

  private async runSlow(signal: AbortSignal, reporter: ProgressReporter): Promise<string> {
    for (let i = 1; i <= 10; i++) {
      await sleep(800, signal)
      reporter.progress(i * 10, `Step ${i} of 10`)
    }
    return 'slow task completed'
  }

  private async runStreaming(
    signal: AbortSignal,
    reporter: ProgressReporter,
    stream?: StreamReporter,
  ): Promise<string> {
    const tokens = [
      'Once', ' upon', ' a', ' time,', ' in', ' a', ' distant', ' galaxy,',
      ' there', ' was', ' a', ' task', ' manager', ' that', ' streamed',
      ' tokens', ' one', ' by', ' one.', ' The', ' end.',
    ]

    reporter.progress(5, 'Starting stream…')

    for (let i = 0; i < tokens.length; i++) {
      await sleep(140, signal)
      stream?.stream(tokens[i])
      reporter.progress(5 + Math.round((i / tokens.length) * 90), 'Streaming…')
    }

    reporter.progress(100, 'Stream complete')
    return tokens.join('')
  }

  private async runError(signal: AbortSignal, reporter: ProgressReporter): Promise<string> {
    await sleep(400, signal); reporter.progress(30, 'Working…')
    await sleep(400, signal); reporter.progress(60, 'Almost there…')
    await sleep(200, signal)
    throw new Error('Demo error: simulated task failure')
  }
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new DOMException('Aborted', 'AbortError')); return }
    const t = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => { clearTimeout(t); reject(new DOMException('Aborted', 'AbortError')) }, { once: true })
  })
}
