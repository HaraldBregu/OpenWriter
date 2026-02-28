import React from 'react'

export interface PersonalitySimpleLayoutProps {
  sectionId: string
  systemPrompt?: string
  placeholder?: string
  providerId?: string
  icon: React.ReactNode
  title: string
  examplePrompt?: string
}

export const PersonalitySimpleLayout: React.FC<PersonalitySimpleLayoutProps> = React.memo(({
  icon,
  title,
}) => {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border px-6 py-4">
        {icon}
        <h1 className="text-xl font-semibold">{title}</h1>
      </div>
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">This feature is not available.</p>
      </div>
    </div>
  )
})

PersonalitySimpleLayout.displayName = 'PersonalitySimpleLayout'
