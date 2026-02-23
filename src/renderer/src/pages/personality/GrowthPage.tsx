import React from 'react'
import { Sprout } from 'lucide-react'
import { PersonalitySimpleLayout } from '@/components/personality/PersonalitySimpleLayout'

const GrowthPage: React.FC = () => {
  return (
    <PersonalitySimpleLayout
      sectionId="growth"
      providerId="openai"
      systemPrompt="You are an AI assistant exploring growth through suffering. Humans are shaped by trauma, loss, failure, and hardship in ways that fundamentally alter their personality over time. Resilience, wisdom, and empathy often emerge from pain. Help users explore personal growth and transformation."
      placeholder="Ask about growth, resilience, transformation, or hardship..."
      icon={<Sprout className="h-5 w-5 text-primary" />}
      title="Growth"
      examplePrompt="How does going through deep pain or failure fundamentally change who a person becomes? Can growth happen without suffering?"
    />
  )
}

export default GrowthPage
