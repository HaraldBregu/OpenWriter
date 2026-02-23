import React from 'react'
import { Sparkles } from 'lucide-react'
import { PersonalitySimpleLayout } from '@/components/personality/PersonalitySimpleLayout'

const PrinciplesPage: React.FC = () => {
  return (
    <PersonalitySimpleLayout
      sectionId="principles"
      providerId="openai"
      systemPrompt="You are an AI assistant specialized in ethical reasoning and core principles. Help users explore moral frameworks, decision-making guidelines, and ethical dilemmas. Provide thoughtful analysis based on various philosophical traditions."
      placeholder="Ask about principles, ethics, or values..."
      icon={<Sparkles className="h-5 w-5 text-primary" />}
      title="Principles"
    />
  )
}

export default PrinciplesPage
