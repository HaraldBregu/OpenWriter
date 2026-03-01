import React, { useCallback, forwardRef } from 'react'
import type { TaskSubmitOptions } from "../../../shared/types";
import type { TaskStatus, TaskProgressState } from '@/store/tasksSlice'
import { useTaskSubmit } from '@/hooks/useTaskSubmit'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Props injected by withTaskTracking into the wrapped component. */
export interface WithTaskTrackingInjectedProps {
  taskTracking: {
    /** Submit the configured task. */
    submit: () => Promise<void>
    /** Cancel the running task. */
    cancel: () => void
    /** Reset hook state. No-op while running. */
    reset: () => void
    /** Current lifecycle status. Null before submit() is called. */
    status: TaskStatus | null
    /** Progress state — percent 0–100 and optional message. */
    progress: TaskProgressState
    /** Optional human-readable progress message. */
    progressMessage: string | undefined
    /** Error message when status === 'error'. */
    error: string | undefined
    /** Result payload when status === 'completed'. */
    result: unknown
    /** Task ID after submission, null before. */
    taskId: string | null
  }
}

/** Configuration object accepted by withTaskTracking. */
export interface TaskTrackingConfig<TInput> {
  type: string
  input: TInput | ((ownProps: Record<string, unknown>) => TInput)
  options?: TaskSubmitOptions
}

// ---------------------------------------------------------------------------
// HOC
// ---------------------------------------------------------------------------

/**
 * withTaskTracking — Higher-Order Component that injects task submission and
 * lifecycle tracking into any component without requiring it to call hooks
 * directly.
 *
 * The wrapped component receives a `taskTracking` prop with all task state
 * and action callbacks. The HOC handles cleanup on unmount automatically.
 *
 * @template TInput Type of the task input payload.
 * @template TProps Type of the wrapped component's own props.
 *
 * Usage:
 *   interface ExportButtonProps {
 *     filePath: string
 *     taskTracking: WithTaskTrackingInjectedProps['taskTracking']
 *   }
 *
 *   function ExportButton({ filePath, taskTracking }: ExportButtonProps) {
 *     return (
 *       <button onClick={taskTracking.submit} disabled={taskTracking.status === 'running'}>
 *         {taskTracking.status === 'running' ? `${taskTracking.progress}%` : 'Export'}
 *       </button>
 *     )
 *   }
 *
 *   export default withTaskTracking(ExportButton, {
 *     type: 'file-export',
 *     input: (props) => ({ path: props.filePath }),
 *   })
 */
export function withTaskTracking<TInput, TProps extends WithTaskTrackingInjectedProps>(
  WrappedComponent: React.ComponentType<TProps>,
  config: TaskTrackingConfig<TInput>
): React.ForwardRefExoticComponent<
  React.PropsWithoutRef<Omit<TProps, keyof WithTaskTrackingInjectedProps>> &
    React.RefAttributes<unknown>
> {
  type OwnProps = Omit<TProps, keyof WithTaskTrackingInjectedProps>

  const displayName = WrappedComponent.displayName ?? WrappedComponent.name ?? 'Component'

  const WithTaskTracking = forwardRef<unknown, OwnProps>((ownProps, ref) => {
    // Resolve input — support static object or factory function
    const resolvedInput = useCallback((): TInput => {
      if (typeof config.input === 'function') {
        return (config.input as (p: Record<string, unknown>) => TInput)(
          ownProps as unknown as Record<string, unknown>
        )
      }
      return config.input as TInput
    }, [ownProps])

    const {
      taskId,
      status,
      progress,
      progressMessage,
      error,
      result,
      submit: hookSubmit,
      cancel,
      reset,
    } = useTaskSubmit<TInput>(config.type, resolvedInput(), config.options)

    // Wrap submit so the HOC's injected prop matches `() => Promise<void>` —
    // the resolved input is captured at call time from the factory/static value.
    const submit = useCallback(
      () => hookSubmit(resolvedInput()),
      [hookSubmit, resolvedInput]
    )

    const taskTracking: WithTaskTrackingInjectedProps['taskTracking'] = {
      submit,
      cancel,
      reset,
      status,
      progress,
      progressMessage,
      error,
      result,
      taskId,
    }

    return (
      <WrappedComponent
        {...(ownProps as unknown as TProps)}
        ref={ref}
        taskTracking={taskTracking}
      />
    )
  })

  WithTaskTracking.displayName = `withTaskTracking(${displayName})`

  return WithTaskTracking
}
