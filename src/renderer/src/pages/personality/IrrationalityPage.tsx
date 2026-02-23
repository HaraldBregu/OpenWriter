import React from 'react'
import { Shuffle } from 'lucide-react'
import { PersonalitySimpleLayout } from '@/components/personality/PersonalitySimpleLayout'

const IrrationalityPage: React.FC = () => {
  return (
    <PersonalitySimpleLayout
      sectionId="irrationality"
      providerId="openai"
      systemPrompt="You are an AI assistant exploring irrationality and cognitive biases. Humans are predictably irrational — influenced by confirmation bias, loss aversion, sunk cost fallacy, tribalism, and mood. These 'flaws' are deeply woven into personality and often serve evolutionary purposes. Help users understand cognitive biases and irrationality."
      placeholder="Ask about cognitive biases, irrationality, or human quirks..."
      icon={<Shuffle className="h-5 w-5 text-primary" />}
      title="Irrationality"
      examplePrompt="Why do people keep investing in something failing just because they've already put so much into it? How does the sunk cost fallacy shape decisions?"
    />
  )
}

export default IrrationalityPage
