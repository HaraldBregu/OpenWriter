import React from 'react'
import { BrainCircuit } from 'lucide-react'
import { BrainChatContainer } from '@/components/brain/BrainChatContainer'

const ReasoningPage: React.FC = () => {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border px-6 py-4">
        <BrainCircuit className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold">Reasoning</h1>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-3 text-lg font-medium">Logical & Analytical Reasoning</h2>
            <p className="text-muted-foreground">
              Deductive, inductive, and abductive reasoning capabilities. This section handles
              logical analysis, problem-solving, causal inference, and structured thinking
              processes.
            </p>
          </div>

          <BrainChatContainer
            sectionId="reasoning"
            systemPrompt="You are an AI assistant specialized in logical and analytical reasoning. Help users solve problems, analyze arguments, understand logical fallacies, and develop structured thinking skills. Use clear, step-by-step explanations."
            placeholder="Ask about logic, problem-solving, or reasoning..."
            emptyStateMessage="Start a conversation about reasoning and logical analysis."
          />
        </div>
      </div>
    </div>
  )
}

export default ReasoningPage
