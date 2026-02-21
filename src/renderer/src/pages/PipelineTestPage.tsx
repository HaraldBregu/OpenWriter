import React, { useState, useEffect, useRef } from 'react'

interface TokenEntry {
  index: number
  token: string
  timestamp: number
}

interface AgentRun {
  runId: string
  agentName: string
  output: string
  status: 'running' | 'done' | 'error'
  thinkingText?: string
  startTime: number
  charCount: number
  tokens: TokenEntry[]
  tokenCount: number
}

const PipelineTestPage: React.FC = () => {
  const [runs, setRuns] = useState<Map<string, AgentRun>>(new Map())
  const [availableAgents, setAvailableAgents] = useState<string[]>([])
  const [showTokenStream, setShowTokenStream] = useState<boolean>(true)
  const tokenStreamRefs = useRef<Map<string, HTMLDivElement | null>>(new Map())

  useEffect(() => {
    // Load available agents
    window.api.pipelineListAgents().then((result) => {
      if (result.success) {
        setAvailableAgents(result.data)
        console.log('[PipelineTest] Available agents:', result.data)
      }
    })

    // Listen for pipeline events
    const cleanup = window.api.onPipelineEvent((event) => {
      console.log('[PipelineTest] Event:', event)

      if (event.type === 'thinking') {
        const data = event.data as { runId: string; text: string }
        setRuns((prev) => {
          const updated = new Map(prev)
          const run = updated.get(data.runId)
          if (run) {
            run.thinkingText = data.text
          }
          return updated
        })
      } else if (event.type === 'token') {
        const data = event.data as { runId: string; token: string }
        setRuns((prev) => {
          const updated = new Map(prev)
          const run = updated.get(data.runId)
          if (run) {
            // Append chunk to output
            run.output += data.token

            // Track characters (length of chunk)
            run.charCount += data.token.length

            // Add chunk to token stream
            run.tokens.push({
              index: run.tokenCount,
              token: data.token,
              timestamp: Date.now() - run.startTime
            })
            run.tokenCount++

            // Auto-scroll token stream to bottom
            setTimeout(() => {
              const streamEl = tokenStreamRefs.current.get(data.runId)
              if (streamEl) {
                streamEl.scrollTop = streamEl.scrollHeight
              }
            }, 0)
          }
          return updated
        })
      } else if (event.type === 'done') {
        const data = event.data as { runId: string }
        setRuns((prev) => {
          const updated = new Map(prev)
          const run = updated.get(data.runId)
          if (run) {
            run.status = 'done'
            run.thinkingText = undefined
          }
          return updated
        })
      } else if (event.type === 'error') {
        const data = event.data as { runId: string; message: string }
        setRuns((prev) => {
          const updated = new Map(prev)
          const run = updated.get(data.runId)
          if (run) {
            run.status = 'error'
            run.output += `\n\nError: ${data.message}`
            run.thinkingText = undefined
          }
          return updated
        })
      }
    })

    return cleanup
  }, [])

  const runAgent = async (agentName: string, prompt: string) => {
    try {
      const result = await window.api.pipelineRun(agentName, { prompt })
      if (result.success) {
        const runId = result.data.runId
        setRuns((prev) => {
          const updated = new Map(prev)
          updated.set(runId, {
            runId,
            agentName,
            output: '',
            status: 'running',
            thinkingText: undefined,
            startTime: Date.now(),
            charCount: 0,
            tokens: [],
            tokenCount: 0
          })
          return updated
        })
        console.log(`[PipelineTest] Started ${agentName} run:`, runId)
      } else {
        console.error('[PipelineTest] Failed to start run:', result.error)
      }
    } catch (err) {
      console.error('[PipelineTest] Error starting run:', err)
    }
  }

  const runBothConcurrent = () => {
    console.log('[PipelineTest] Running counter and alphabet concurrently...')
    runAgent('counter', 'Count to 10 with fun facts about each number')
    runAgent('alphabet', 'List the alphabet with an animal for each letter')
  }

  const runAgentMultipleTimes = async (agentName: string, prompt: string, times: number) => {
    console.log(`[PipelineTest] Running ${agentName} ${times} times concurrently...`)
    for (let i = 0; i < times; i++) {
      // Add slight delay between starts to avoid overwhelming the system
      if (i > 0) await new Promise(resolve => setTimeout(resolve, 100))
      const instancePrompt = `[Instance ${i + 1}/${times}] ${prompt}`
      runAgent(agentName, instancePrompt)
    }
  }

  const clearRuns = () => {
    setRuns(new Map())
  }

  return (
    <div className="flex flex-col h-full p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-normal mb-2">Pipeline Test Page</h1>
        <p className="text-sm text-muted-foreground">
          Test concurrent AI pipeline execution with LangChain-powered agents
        </p>
        <div className="flex flex-col gap-1 mt-2">
          <p className="text-xs text-muted-foreground">
            ⚠️ Requires OpenAI API key configured in Settings
          </p>
          <p className="text-xs text-muted-foreground">
            💡 Recommended models: <span className="font-mono">gpt-4o</span>, <span className="font-mono">gpt-4o-mini</span>, <span className="font-mono">gpt-4-turbo</span>
          </p>
        </div>
      </div>

      {/* Available Agents */}
      <section className="space-y-3">
        <h2 className="text-sm font-normal text-muted-foreground">Available Agents</h2>
        <div className="flex flex-wrap gap-2">
          {availableAgents.map((agent) => (
            <span
              key={agent}
              className="px-3 py-1 rounded-md bg-muted text-sm font-mono"
            >
              {agent}
            </span>
          ))}
        </div>
      </section>

      {/* Control Buttons */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-normal text-muted-foreground">Test Controls</h2>
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={showTokenStream}
              onChange={(e) => setShowTokenStream(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span>Show Token Stream</span>
          </label>
        </div>
        <div className="space-y-3">
          {/* Single Instance Buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => runAgent('counter', 'Count to 10')}
              className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              🔢 Counter AI (Count to 10)
            </button>
            <button
              onClick={() => runAgent('alphabet', 'List the first 10 letters')}
              className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors"
            >
              🔤 Alphabet AI (First 10)
            </button>
            <button
              onClick={runBothConcurrent}
              className="px-4 py-2 rounded-md bg-purple-600 text-white hover:bg-purple-700 transition-colors font-semibold"
            >
              🚀 Run Both AI Agents
            </button>
            <button
              onClick={() => runAgent('chat', 'Tell me a short joke')}
              className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              💬 Chat AI (Joke)
            </button>
            <button
              onClick={() => runAgent('echo', 'Hello from the echo agent!')}
              className="px-4 py-2 rounded-md bg-orange-600 text-white hover:bg-orange-700 transition-colors"
            >
              📢 Echo (No API key)
            </button>
            <button
              onClick={clearRuns}
              className="px-4 py-2 rounded-md bg-gray-600 text-white hover:bg-gray-700 transition-colors"
            >
              🗑️ Clear Results
            </button>
          </div>

          {/* Multi-Instance Buttons */}
          <div className="border-t pt-3">
            <div className="text-xs font-medium text-muted-foreground mb-2">
              🔀 Concurrent Instances (Same Agent Multiple Times)
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => runAgentMultipleTimes('counter', 'Count to 5', 2)}
                className="px-3 py-1.5 text-sm rounded-md bg-blue-600/80 text-white hover:bg-blue-600 transition-colors"
              >
                Counter × 2
              </button>
              <button
                onClick={() => runAgentMultipleTimes('counter', 'Count to 5', 3)}
                className="px-3 py-1.5 text-sm rounded-md bg-blue-600/80 text-white hover:bg-blue-600 transition-colors"
              >
                Counter × 3
              </button>
              <button
                onClick={() => runAgentMultipleTimes('alphabet', 'First 5 letters', 2)}
                className="px-3 py-1.5 text-sm rounded-md bg-green-600/80 text-white hover:bg-green-600 transition-colors"
              >
                Alphabet × 2
              </button>
              <button
                onClick={() => runAgentMultipleTimes('chat', 'Tell me a fun fact', 3)}
                className="px-3 py-1.5 text-sm rounded-md bg-indigo-600/80 text-white hover:bg-indigo-600 transition-colors"
              >
                Chat × 3
              </button>
              <button
                onClick={() => runAgentMultipleTimes('echo', 'Hello!', 5)}
                className="px-3 py-1.5 text-sm rounded-md bg-orange-600/80 text-white hover:bg-orange-600 transition-colors"
              >
                Echo × 5 (Fast!)
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Active Runs Summary */}
      {runs.size > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-normal text-muted-foreground">Summary</h2>
          <div className="flex flex-wrap gap-2">
            {(() => {
              const agentCounts = new Map<string, number>()
              runs.forEach(run => {
                agentCounts.set(run.agentName, (agentCounts.get(run.agentName) || 0) + 1)
              })
              return Array.from(agentCounts.entries()).map(([agentName, count]) => (
                <div
                  key={agentName}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50 text-sm"
                >
                  <span className="font-mono font-semibold">{agentName}</span>
                  {count > 1 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold">
                      × {count}
                    </span>
                  )}
                </div>
              ))
            })()}
          </div>
        </section>
      )}

      {/* Active Runs */}
      <section className="flex-1 space-y-3 overflow-hidden flex flex-col">
        <h2 className="text-sm font-normal text-muted-foreground">
          Active Runs ({runs.size})
        </h2>
        <div className="flex-1 overflow-y-auto space-y-3">
          {Array.from(runs.values()).map((run) => (
            <div
              key={run.runId}
              className="rounded-md border p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold">{run.agentName}</span>
                    {(() => {
                      const sameAgentRuns = Array.from(runs.values()).filter(r => r.agentName === run.agentName)
                      if (sameAgentRuns.length > 1) {
                        const instanceNum = sameAgentRuns.findIndex(r => r.runId === run.runId) + 1
                        return (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-400 font-bold">
                            #{instanceNum}
                          </span>
                        )
                      }
                      return null
                    })()}
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      run.status === 'running'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : run.status === 'done'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}
                  >
                    {run.status}
                  </span>
                  {run.charCount > 0 && (
                    <span className="text-xs text-muted-foreground font-mono">
                      {run.charCount} chars
                    </span>
                  )}
                  {run.status === 'done' && (
                    <span className="text-xs text-muted-foreground font-mono">
                      {((Date.now() - run.startTime) / 1000).toFixed(1)}s
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground font-mono">
                  {run.runId.slice(0, 8)}
                </span>
              </div>

              {run.thinkingText && (
                <div className="text-xs text-muted-foreground italic animate-pulse">
                  💭 {run.thinkingText}
                </div>
              )}

              <div className="grid grid-cols-1 gap-3">
                {/* Accumulated Output */}
                <div className="relative">
                  <div className="text-xs font-medium text-muted-foreground mb-1.5">
                    Accumulated Output
                  </div>
                  <pre className="text-sm font-mono bg-muted/30 p-3 rounded overflow-x-auto whitespace-pre-wrap break-words min-h-[60px]">
                    {run.output || '(waiting for output...)'}
                    {run.status === 'running' && run.output && (
                      <span className="inline-block w-1.5 h-4 bg-foreground ml-0.5 animate-pulse">│</span>
                    )}
                  </pre>
                  {run.status === 'running' && (
                    <div className="absolute top-2 right-2">
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs">
                        <span className="animate-ping inline-block w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        <span className="font-medium">Streaming...</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Token Stream */}
                {showTokenStream && run.tokens.length > 0 && (
                  <div className="relative">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="text-xs font-medium text-muted-foreground">
                          Token Stream (Chunks)
                        </div>
                        {run.status === 'running' && (
                          <span className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400">
                            <span className="inline-block w-1 h-1 rounded-full bg-blue-500 animate-pulse"></span>
                            Live
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-xs text-muted-foreground">
                          {run.tokenCount} chunks · {run.charCount} chars
                        </div>
                        {run.tokenCount > 0 && (
                          <div className="text-[10px] text-muted-foreground/60 font-mono">
                            ~{Math.round(run.tokenCount / ((Date.now() - run.startTime) / 1000))} chunks/s
                          </div>
                        )}
                      </div>
                    </div>
                    <div
                      ref={(el) => {
                        if (el) tokenStreamRefs.current.set(run.runId, el)
                      }}
                      className="bg-muted/30 p-3 rounded max-h-[200px] overflow-y-auto scroll-smooth"
                    >
                      <div className="space-y-0.5">
                        {run.tokens.slice(-100).map((tokenEntry, idx) => {
                          const isLatest = idx === run.tokens.slice(-100).length - 1
                          return (
                            <div
                              key={`${run.runId}-${tokenEntry.index}`}
                              className={`flex items-center gap-2 text-xs font-mono group hover:bg-muted/50 px-2 py-1 rounded transition-all ${
                                isLatest && run.status === 'running'
                                  ? 'bg-blue-500/5 animate-pulse'
                                  : ''
                              }`}
                            >
                              <span className="text-muted-foreground/40 w-12 shrink-0 text-[10px]">
                                #{tokenEntry.index}
                              </span>
                              <span className="flex-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded font-semibold text-xs break-all">
                                {tokenEntry.token === ' '
                                  ? '␣'
                                  : tokenEntry.token === '\n'
                                    ? '↵'
                                    : tokenEntry.token === '\t'
                                      ? '→'
                                      : tokenEntry.token}
                              </span>
                              <div className="flex flex-col items-end shrink-0">
                                <span className="text-muted-foreground/40 text-[10px]">
                                  +{tokenEntry.timestamp}ms
                                </span>
                                {tokenEntry.token.length > 1 && (
                                  <span className="text-muted-foreground/30 text-[9px]">
                                    {tokenEntry.token.length} ch
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                        {run.tokens.length > 100 && (
                          <div className="text-xs text-muted-foreground/50 italic text-center py-2">
                            Showing last 100 tokens of {run.tokens.length}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default PipelineTestPage
