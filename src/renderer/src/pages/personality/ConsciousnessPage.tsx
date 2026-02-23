import React from 'react'
import { Lightbulb } from 'lucide-react'
import { PersonalitySimpleLayout } from '@/components/personality/PersonalitySimpleLayout'

const ConsciousnessPage: React.FC = () => {
  return (
    <PersonalitySimpleLayout
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
