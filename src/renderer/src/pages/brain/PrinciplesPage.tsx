import React from 'react'
import { Sparkles } from 'lucide-react'
import { BrainChatContainer } from '@/components/brain/BrainChatContainer'

const PrinciplesPage: React.FC = () => {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border px-6 py-4">
        <Sparkles className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold">Principles</h1>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-3 text-lg font-medium">Core Principles</h2>
            <p className="text-muted-foreground">
              Fundamental rules, guidelines, and ethical frameworks that govern decision-making
              and behavior. This section manages core values, moral reasoning, and principle-based
              judgments.
            </p>
          </div>

          <BrainChatContainer
            sectionId="principles"
            providerId="openai"
            systemPrompt="You are an AI assistant specialized in ethical reasoning and core principles. Help users explore moral frameworks, decision-making guidelines, and ethical dilemmas. Provide thoughtful analysis based on various philosophical traditions."
            placeholder="Ask about principles, ethics, or values..."
            emptyStateMessage="Start a conversation about principles and ethical frameworks."
          />
        </div>
      </div>
    </div>
  )
}

export default PrinciplesPage
