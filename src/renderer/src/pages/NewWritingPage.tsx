import React from 'react'
import { PenLine } from 'lucide-react'

const NewWritingPage: React.FC = () => {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-8">
      <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
        <PenLine className="h-5 w-5 text-blue-600 dark:text-blue-400" />
      </div>
      <div>
        <h1 className="text-lg font-medium text-foreground">New Writing</h1>
        <p className="text-sm text-muted-foreground mt-1">Start a blank document.</p>
      </div>
    </div>
  )
}

export default NewWritingPage
