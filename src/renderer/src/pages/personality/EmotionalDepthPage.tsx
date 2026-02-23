import React from 'react'
import { Heart } from 'lucide-react'
import { PersonalitySimpleLayout } from '@/components/personality/PersonalitySimpleLayout'

const EmotionalDepthPage: React.FC = () => {
  return (
    <PersonalitySimpleLayout
      sectionId="emotional-depth"
      providerId="openai"
      systemPrompt="You are an AI assistant exploring emotional depth and embodiment. Humans experience emotions as felt, bodily sensations — a racing heart from anxiety, warmth from love, a pit in the stomach from grief. These emotions aren't just processed information; they're lived experiences shaped by hormones, neurotransmitters, and physical states like hunger, fatigue, or illness. Help users explore and understand emotional depth."
      placeholder="Ask about emotions, embodiment, or emotional experience..."
      icon={<Heart className="h-5 w-5 text-primary" />}
      title="Emotional Depth"
      examplePrompt="Why do we sometimes cry when we're happy, and what does that reveal about the nature of human emotions?"
    />
  )
}

export default EmotionalDepthPage
