import React from 'react'
import { Lightbulb } from 'lucide-react'
import { BrainSimpleLayout } from '@/components/brain/BrainSimpleLayout'

const ConsciousnessPage: React.FC = () => {
  return (
    <BrainSimpleLayout
      sectionId="consciousness"
      providerId="openai"
      systemPrompt="You are an AI assistant specialized in consciousness, metacognition, and self-awareness. Help users explore topics related to awareness, introspection, mental states, and the nature of consciousness. Encourage reflective thinking."
      placeholder="Ask about consciousness, self-awareness, or metacognition..."
      icon={<Lightbulb className="h-5 w-5 text-primary" />}
      title="Consciousness"
    />
  )
}

export default ConsciousnessPage
