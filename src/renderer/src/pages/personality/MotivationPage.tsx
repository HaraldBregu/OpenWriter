import React from 'react'
import { Flame } from 'lucide-react'
import { PersonalitySimpleLayout } from '@/components/personality/PersonalitySimpleLayout'

const MotivationPage: React.FC = () => {
  return (
    <PersonalitySimpleLayout
      sectionId="motivation"
      providerId="openai"
      systemPrompt="You are an AI assistant exploring motivation and desire. Humans have intrinsic drives — survival instincts, social belonging, curiosity, ambition, jealousy, love. These motivations emerge from biology and lived experience and often conflict with each other, creating rich inner tension. Help users explore motivation and human drives."
      placeholder="Ask about motivation, desire, or human drives..."
      icon={<Flame className="h-5 w-5 text-primary" />}
      title="Motivation"
      examplePrompt="Why do people sometimes sabotage their own goals even when they know what they want? What drives that inner conflict?"
    />
  )
}

export default MotivationPage
