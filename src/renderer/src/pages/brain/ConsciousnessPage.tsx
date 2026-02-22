import React from 'react'
import { Lightbulb } from 'lucide-react'

const ConsciousnessPage: React.FC = () => {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border px-6 py-4">
        <Lightbulb className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold">Consciousness</h1>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-3 text-lg font-medium">Self-Awareness & Metacognition</h2>
            <p className="text-muted-foreground">
              Awareness of internal states, thoughts, and cognitive processes. This section
              simulates metacognitive abilities, self-reflection, and awareness of the
              reasoning process itself.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConsciousnessPage
