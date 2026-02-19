import React from 'react'
import { StickyNote } from 'lucide-react'

const NewNotePage: React.FC = () => {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-8">
      <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
        <StickyNote className="h-5 w-5 text-amber-600 dark:text-amber-400" />
      </div>
      <div>
        <h1 className="text-lg font-medium text-foreground">New Note</h1>
        <p className="text-sm text-muted-foreground mt-1">Capture a quick thought.</p>
      </div>
    </div>
  )
}

export default NewNotePage
