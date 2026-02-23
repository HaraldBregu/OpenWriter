import React from 'react'
import { Scale } from 'lucide-react'
import { PersonalitySimpleLayout } from '@/components/personality/PersonalitySimpleLayout'

const MoralIntuitionPage: React.FC = () => {
  return (
    <PersonalitySimpleLayout
      sectionId="moral-intuition"
      providerId="openai"
      systemPrompt="You are an AI assistant exploring moral intuition and moral struggle. Humans often 'feel' something is right or wrong before they can articulate why. Moral reasoning in humans involves genuine internal conflict, guilt, shame, and the weight of consequences that affect their own lives. Help users explore moral intuition."
      placeholder="Ask about moral intuition, ethics, or moral struggle..."
      icon={<Scale className="h-5 w-5 text-primary" />}
      title="Moral Intuition"
      examplePrompt="Why do we sometimes feel something is wrong even when we can't explain why? Where does moral intuition come from?"
    />
  )
}

export default MoralIntuitionPage
