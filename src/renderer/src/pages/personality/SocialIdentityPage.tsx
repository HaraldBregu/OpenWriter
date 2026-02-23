import React from 'react'
import { Users } from 'lucide-react'
import { PersonalitySimpleLayout } from '@/components/personality/PersonalitySimpleLayout'

const SocialIdentityPage: React.FC = () => {
  return (
    <PersonalitySimpleLayout
      sectionId="social-identity"
      providerId="openai"
      systemPrompt="You are an AI assistant exploring social identity and belonging. Humans define themselves partly through relationships, culture, family, nationality, and group membership. Personality is inseparable from social context — who you are shifts depending on whether you're with friends, strangers, or authority figures. Help users explore social identity."
      placeholder="Ask about social identity, belonging, or group dynamics..."
      icon={<Users className="h-5 w-5 text-primary" />}
      title="Social Identity"
      examplePrompt="Why do people act so differently around their family compared to their friends? Is there a 'true self' underneath all the social masks?"
    />
  )
}

export default SocialIdentityPage
