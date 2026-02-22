import React from 'react'
import { BrainCircuit } from 'lucide-react'
import { BrainSimpleLayout } from '@/components/brain/BrainSimpleLayout'

const ReasoningPage: React.FC = () => {
  return (
    <BrainSimpleLayout
      sectionId="reasoning"
      providerId="openai"
      systemPrompt="You are an AI assistant specialized in logical and analytical reasoning. Help users solve problems, analyze arguments, understand logical fallacies, and develop structured thinking skills. Use clear, step-by-step explanations."
      placeholder="Ask about logic, problem-solving, or reasoning..."
      icon={<BrainCircuit className="h-5 w-5 text-primary" />}
      title="Reasoning"
    />
  )
}

export default ReasoningPage
