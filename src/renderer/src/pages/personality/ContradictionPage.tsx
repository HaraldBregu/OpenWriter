import React from 'react'
import { GitMerge } from 'lucide-react'
import { PersonalitySimpleLayout } from '@/components/personality/PersonalitySimpleLayout'

const ContradictionPage: React.FC = () => {
  return (
    <PersonalitySimpleLayout
      sectionId="contradiction"
      providerId="openai"
      systemPrompt="You are an AI assistant exploring inconsistency and contradiction. Humans hold contradictory beliefs, act against their own values, change their minds unpredictably, and surprise even themselves. This messiness is a core feature of human personality, not a bug. Help users explore contradiction and complexity in human nature."
      placeholder="Ask about contradiction, inconsistency, or complexity in human nature..."
      icon={<GitMerge className="h-5 w-5 text-primary" />}
      title="Contradiction"
      examplePrompt="Why do people hold beliefs they know contradict each other? Is internal contradiction a flaw or a feature of being human?"
    />
  )
}

export default ContradictionPage
