import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Bug, X, Square, EyeOff, Zap, Clock, Radio, AlertTriangle, Bot, Copy, Check, ChevronDown, ChevronRight, RefreshCw, Play, RotateCcw, Loader2, PenLine } from 'lucide-react'
import { useDebugTasks } from '../hooks/useDebugTasks'
import { useTaskSubmit } from '../hooks/useTaskSubmit'
import { subscribeToTask } from '../services/taskEventBus'
import type { TaskSnapshot } from '../services/taskEventBus'
import type { TrackedTaskState, TaskStatus } from '@/store/tasks/types'
import { taskAdded } from '@/store/tasks/actions'
import { store, useAppSelector } from '@/store'
import type { RootState } from '@/store'

// ---------------------------------------------------------------------------
// Demo task submission
// ---------------------------------------------------------------------------

type DemoVariant = 'fast' | 'slow' | 'streaming' | 'error'

const DEMO_VARIANTS: {
  variant: DemoVariant
  label: string
  icon: React.ElementType
  description: string
}[] = [
  { variant: 'fast',      label: 'Fast',    icon: Zap,           description: '4 steps, ~1.2 s' },
  { variant: 'slow',      label: 'Slow',    icon: Clock,         description: '10 steps, ~8 s' },
  { variant: 'streaming', label: 'Stream',  icon: Radio,         description: 'Token stream, ~3 s' },
  { variant: 'error',     label: 'Error',   icon: AlertTriangle, description: 'Fails at 60 %' },
]

async function submitDemoTask(variant: DemoVariant): Promise<void> {
  const result = await window.task.submit('demo', { variant }, { priority: 'normal' })
  if (result.success && result.data?.taskId) {
    // Pre-seed the Redux store so the row appears immediately; the IPC 'queued'
    // event will arrive shortly and fill in progress / status updates.
    store.dispatch(taskAdded({ taskId: result.data.taskId, type: 'demo' }))
  }
}

const AGENT_DEMO_PROMPT = 'Tell me an interesting fact about technology'

async function submitAgentTask(): Promise<void> {
  const result = await window.task.submit(
    'agent-demo-agent',
    { prompt: AGENT_DEMO_PROMPT },
    { priority: 'normal' },
  )
  if (result.success && result.data?.taskId) {
    store.dispatch(taskAdded({ taskId: result.data.taskId, type: 'agent-demo-agent' }))
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<TaskStatus, { label: string; className: string }> = {
  queued: {
    label: 'Queued',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  },
  running: {
    label: 'Running',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  },
  completed: {
    label: 'Completed',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  },
  error: {
    label: 'Error',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  },
}

function formatDuration(ms?: number): string {
  if (!ms) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function formatEventTime(receivedAt: number): string {
  return new Date(receivedAt).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

// ---------------------------------------------------------------------------
// StatusBadge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: TaskStatus }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, className: 'bg-gray-100 text-gray-600' }
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cfg.className}`}
    >
      {cfg.label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// ProgressBar
// ---------------------------------------------------------------------------

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="w-20 bg-muted rounded-full h-1.5">
      <div
        className="bg-primary h-1.5 rounded-full transition-all"
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// LogPanel
// ---------------------------------------------------------------------------

interface LogPanelProps {
  task: TrackedTaskState
  onClose: () => void
}

function LogPanel({ task, onClose }: LogPanelProps) {
  return (
    <div className="flex flex-col border-l bg-muted/20 w-80 shrink-0 h-full">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{task.type || 'Unknown'}</p>
          <p className="text-xs text-muted-foreground font-mono">
            {task.taskId.slice(0, 12)}…
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="ml-2 shrink-0 p-1 rounded hover:bg-accent transition-colors"
          title="Close logs"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Event list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {task.events.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">No events yet</p>
        ) : (
          [...task.events].reverse().map((ev, i) => (
            <div key={i} className="rounded border bg-background p-2 text-xs">
              <div className="flex items-center justify-between mb-1 gap-2">
                <span className="font-medium shrink-0">{ev.type}</span>
                <span className="text-muted-foreground shrink-0">
                  {formatEventTime(ev.receivedAt)}
                </span>
              </div>
              <pre className="text-muted-foreground overflow-x-auto whitespace-pre-wrap break-all text-[10px] leading-relaxed">
                {JSON.stringify(ev.data, null, 2)}
              </pre>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// TaskRow
// ---------------------------------------------------------------------------

interface TaskRowProps {
  task: TrackedTaskState
  isSelected: boolean
  onSelect: () => void
  onCancel: () => void
  onHide: () => void
}

function TaskRow({ task, isSelected, onSelect, onCancel, onHide }: TaskRowProps) {
  const canCancel = task.status === 'running' || task.status === 'queued'

  return (
    <tr
      className={`border-b cursor-pointer transition-colors hover:bg-muted/30 ${isSelected ? 'bg-muted/50' : ''}`}
      onClick={onSelect}
    >
      <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground">
        {task.taskId.slice(0, 8)}…
      </td>
      <td className="px-4 py-2.5 text-sm max-w-[160px] truncate">{task.type || '—'}</td>
      <td className="px-4 py-2.5">
        <StatusBadge status={task.status} />
      </td>
      <td className="px-4 py-2.5 text-xs capitalize text-muted-foreground">{task.priority}</td>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2">
          <ProgressBar percent={task.progress.percent} />
          <span className="text-xs text-muted-foreground w-8 shrink-0">
            {task.progress.percent}%
          </span>
        </div>
      </td>
      <td className="px-4 py-2.5 text-xs text-muted-foreground">{formatDuration(task.durationMs)}</td>
      {/* Actions — stop propagation so clicking a button doesn't toggle row selection */}
      <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1">
          {canCancel && (
            <button
              type="button"
              title="Cancel"
              onClick={onCancel}
              className="p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground"
            >
              <Square className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            title="Hide"
            onClick={onHide}
            className="p-1 rounded hover:bg-accent transition-colors text-muted-foreground"
          >
            <EyeOff className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  )
}

// ---------------------------------------------------------------------------
// SliceSection — collapsible JSON viewer for a single Redux slice
// ---------------------------------------------------------------------------

const SLICE_NAMES = ['workspace', 'tasks', 'writings'] as const
type SliceName = (typeof SLICE_NAMES)[number]

function entryCount(value: unknown): string {
  if (Array.isArray(value)) return `${value.length} items`
  if (value && typeof value === 'object') return `${Object.keys(value).length} keys`
  return typeof value
}

function SliceSection({ name, data }: { name: SliceName; data: unknown }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const json = JSON.stringify(data, null, 2)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(json)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [json])

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 w-full px-4 py-2.5 text-left hover:bg-muted/50 transition-colors"
      >
        {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
        <span className="text-sm font-medium">{name}</span>
        <span className="text-xs text-muted-foreground ml-auto">{entryCount(data)}</span>
      </button>

      {open && (
        <div className="border-t relative">
          <button
            type="button"
            onClick={handleCopy}
            title="Copy to clipboard"
            className="absolute top-2 right-2 p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          <pre className="p-4 pr-10 text-xs font-mono overflow-auto max-h-96 bg-muted/20 text-muted-foreground whitespace-pre-wrap break-all">
            {json}
          </pre>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ReduxStateTab
// ---------------------------------------------------------------------------

function ReduxStateTab() {
  const [live, setLive] = useState(false)
  const [tick, setTick] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // When live mode is on, bump tick every second to force re-render
  useEffect(() => {
    if (live) {
      intervalRef.current = setInterval(() => setTick((t) => t + 1), 1000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [live])

  // Read slices — selector identity changes each render when live ticking,
  // which is intentional so we always get the latest snapshot.
  const workspace = useAppSelector((s: RootState) => s.workspace)
  const tasks = useAppSelector((s: RootState) => s.tasks)
  const writings = useAppSelector((s: RootState) => s.writings)

  // Suppress unused-var warning — tick is used to trigger re-renders
  void tick

  const slices: { name: SliceName; data: unknown }[] = [
    { name: 'workspace', data: workspace },
    { name: 'tasks', data: tasks },
    { name: 'writings', data: writings },
  ]

  return (
    <div className="flex-1 overflow-auto p-6 space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setTick((t) => t + 1)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md border bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <RefreshCw className="h-3 w-3" />
          Refresh
        </button>
        <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer select-none">
          <input
            type="checkbox"
            checked={live}
            onChange={(e) => setLive(e.target.checked)}
            className="rounded border-muted-foreground"
          />
          Live (1 s)
        </label>
      </div>

      {/* Slice cards */}
      {slices.map(({ name, data }) => (
        <SliceSection key={name} name={name} data={data} />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// TasksTab — extracted from the original DebugPage content
// ---------------------------------------------------------------------------

function TasksTab() {
  const { tasks, queueStats, hide, cancel } = useDebugTasks()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selectedTask = tasks.find((t) => t.taskId === selectedId) ?? null

  const handleSelect = useCallback((taskId: string) => {
    setSelectedId((prev) => (prev === taskId ? null : taskId))
  }, [])

  const handleHide = useCallback(
    (taskId: string) => {
      if (selectedId === taskId) setSelectedId(null)
      hide(taskId)
    },
    [selectedId, hide],
  )

  return (
    <div className="flex flex-1 min-h-0">
      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        {/* Task header controls */}
        <div className="px-6 py-3 border-b shrink-0 space-y-2">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span><span className="font-medium text-foreground">{queueStats.running}</span> running</span>
            <span><span className="font-medium text-foreground">{queueStats.queued}</span> queued</span>
            <span><span className="font-medium text-foreground">{queueStats.completed}</span> completed</span>
            {queueStats.error > 0 && (
              <span className="text-destructive">
                <span className="font-medium">{queueStats.error}</span> errors
              </span>
            )}
          </div>

          {/* Demo task CTAs */}
          <div className="flex items-center gap-2 pb-1">
            <span className="text-xs text-muted-foreground shrink-0">Demo task:</span>
            {DEMO_VARIANTS.map(({ variant, label, icon: Icon, description }) => (
              <button
                key={variant}
                type="button"
                title={description}
                onClick={() => submitDemoTask(variant)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md border bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <Icon className="h-3 w-3 shrink-0" />
                {label}
              </button>
            ))}
          </div>

          {/* Agent task CTAs */}
          <div className="flex items-center gap-2 pb-1">
            <span className="text-xs text-muted-foreground shrink-0">Agent task:</span>
            <button
              type="button"
              title={`Prompt: "${AGENT_DEMO_PROMPT}"`}
              onClick={submitAgentTask}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md border bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Bot className="h-3 w-3 shrink-0" />
              Demo Agent
            </button>
          </div>
        </div>

        {/* Task table */}
        <div className="flex-1 overflow-auto">
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
              <Bug className="h-10 w-10 opacity-20" />
              <p className="text-sm">No tasks tracked yet</p>
              <p className="text-xs opacity-60">Tasks will appear here when submitted</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="border-b sticky top-0 bg-background z-10">
                <tr>
                  <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">ID</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Priority</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Progress</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Duration</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <TaskRow
                    key={task.taskId}
                    task={task}
                    isSelected={selectedId === task.taskId}
                    onSelect={() => handleSelect(task.taskId)}
                    onCancel={() => cancel(task.taskId)}
                    onHide={() => handleHide(task.taskId)}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Log panel */}
      {selectedTask && <LogPanel task={selectedTask} onClose={() => setSelectedId(null)} />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// DebugPage
// ---------------------------------------------------------------------------

type DebugTab = 'tasks' | 'redux'

export default function DebugPage() {
  const [activeTab, setActiveTab] = useState<DebugTab>('tasks')

  return (
    <div className="flex flex-col h-full">
      {/* Header with tabs */}
      <div className="px-6 py-3 border-b shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Bug className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-lg font-semibold">Debug</h1>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('tasks')}
              className={`px-3 py-1 text-xs rounded-md border transition-colors ${
                activeTab === 'tasks'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              Tasks
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('redux')}
              className={`px-3 py-1 text-xs rounded-md border transition-colors ${
                activeTab === 'redux'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              Redux State
            </button>
          </div>
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'tasks' ? <TasksTab /> : <ReduxStateTab />}
    </div>
  )
}
