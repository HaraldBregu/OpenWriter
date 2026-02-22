import React from 'react'
import { Database } from 'lucide-react'

const MemoryPage: React.FC = () => {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border px-6 py-4">
        <Database className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold">Memory</h1>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-3 text-lg font-medium">Memory Systems</h2>
            <p className="text-muted-foreground">
              Storage and retrieval of information across short-term, working, and long-term
              memory systems. This section manages episodic memories, semantic knowledge,
              and procedural learning.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MemoryPage
