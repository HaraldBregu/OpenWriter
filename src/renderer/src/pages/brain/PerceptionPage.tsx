import React from 'react'
import { Eye } from 'lucide-react'
import { BrainChatContainer } from '@/components/brain/BrainChatContainer'

const PerceptionPage: React.FC = () => {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border px-6 py-4">
        <Eye className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold">Perception</h1>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-3 text-lg font-medium">Sensory Processing & Pattern Recognition</h2>
            <p className="text-muted-foreground">
              Processing and interpreting sensory information from various inputs. This section
              handles visual processing, pattern detection, feature extraction, and multi-modal
              input integration.
            </p>
          </div>

          <BrainChatContainer
            sectionId="perception"
            providerId="openai"
            systemPrompt="You are an AI assistant specialized in perception, pattern recognition, and sensory processing. Help users understand how perception works, cognitive biases in perception, pattern detection, and multi-sensory integration."
            placeholder="Ask about perception, patterns, or sensory processing..."
            emptyStateMessage="Start a conversation about perception and pattern recognition."
          />
        </div>
      </div>
    </div>
  )
}

export default PerceptionPage
