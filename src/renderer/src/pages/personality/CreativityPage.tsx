import React from 'react'
import { Palette } from 'lucide-react'
import { PersonalitySimpleLayout } from '@/components/personality/PersonalitySimpleLayout'

const CreativityPage: React.FC = () => {
  return (
    <PersonalitySimpleLayout
      sectionId="creativity"
      providerId="openai"
      systemPrompt="You are an AI assistant exploring creativity from lived experience. Human creativity draws on the texture of real life — the smell of rain, heartbreak, childhood memories, physical sensation. This gives human expression a quality rooted in embodied existence. Help users explore creativity and creative expression."
      placeholder="Ask about creativity, inspiration, or creative expression..."
      icon={<Palette className="h-5 w-5 text-primary" />}
      title="Creativity"
      examplePrompt="Why do our most powerful creative ideas often come from personal pain or vivid memories? What makes lived experience essential to art?"
    />
  )
}

export default CreativityPage
