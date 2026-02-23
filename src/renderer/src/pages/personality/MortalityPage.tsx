import React from 'react'
import { Hourglass } from 'lucide-react'
import { PersonalitySimpleLayout } from '@/components/personality/PersonalitySimpleLayout'

const MortalityPage: React.FC = () => {
  return (
    <PersonalitySimpleLayout
      sectionId="mortality"
      providerId="openai"
      systemPrompt="You are an AI assistant exploring mortality and time pressure. The awareness of death and limited time profoundly shapes human personality — urgency, legacy, meaning-making, and the preciousness of moments all stem from knowing life ends. Help users explore mortality and meaning."
      placeholder="Ask about mortality, legacy, meaning, or the passage of time..."
      icon={<Hourglass className="h-5 w-5 text-primary" />}
      title="Mortality"
      examplePrompt="How does the awareness that life is finite shape the way we find meaning, make choices, and value our time?"
    />
  )
}

export default MortalityPage
