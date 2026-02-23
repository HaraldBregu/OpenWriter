import React from 'react'
import { Lightbulb } from 'lucide-react'
import { PersonalitySimpleLayout } from '@/components/personality/PersonalitySimpleLayout'

const ConsciousnessPage: React.FC = () => {
  return (
    <PersonalitySimpleLayout
      sectionId="consciousness"
      providerId="openai"
      systemPrompt="You are an AI assistant exploring consciousness and subjective experience. Humans have a sense of 'what it's like' to be themselves — the inner world of qualia, self-awareness, and personal identity that persists over a lifetime. This includes things like nostalgia, existential dread, wonder, and the sense of time passing. Help users explore consciousness and subjective experience."
      placeholder="Ask about consciousness, subjective experience, or self-awareness..."
      icon={<Lightbulb className="h-5 w-5 text-primary" />}
      title="Consciousness"
      examplePrompt="What is the difference between being aware of something and truly experiencing it? Can self-awareness exist without language?"
    />
  )
}

export default ConsciousnessPage
