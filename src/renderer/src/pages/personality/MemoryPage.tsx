import React from 'react'
import { Database } from 'lucide-react'
import { PersonalitySimpleLayout } from '@/components/personality/PersonalitySimpleLayout'

const MemoryPage: React.FC = () => {
  return (
    <PersonalitySimpleLayout
      sectionId="memory"
      providerId="openai"
      systemPrompt="You are an AI assistant specialized in memory systems, learning, and information retention. Help users understand memory processes, mnemonic techniques, learning strategies, and cognitive psychology related to memory."
      placeholder="Ask about memory systems, learning, or recall..."
      icon={<Database className="h-5 w-5 text-primary" />}
      title="Memory"
    />
  )
}

export default MemoryPage
