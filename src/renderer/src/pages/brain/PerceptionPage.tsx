import React from 'react'
import { Eye } from 'lucide-react'
import { BrainSimpleLayout } from '@/components/brain/BrainSimpleLayout'

const PerceptionPage: React.FC = () => {
  return (
    <BrainSimpleLayout
      sectionId="perception"
      providerId="openai"
      systemPrompt="You are an AI assistant specialized in perception, pattern recognition, and sensory processing. Help users understand how perception works, cognitive biases in perception, pattern detection, and multi-sensory integration."
      placeholder="Ask about perception, patterns, or sensory processing..."
      icon={<Eye className="h-5 w-5 text-primary" />}
      title="Perception"
    />
  )
}

export default PerceptionPage
