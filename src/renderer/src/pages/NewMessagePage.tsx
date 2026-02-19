import React from 'react'
import { MessageSquare } from 'lucide-react'

const NewMessagePage: React.FC = () => {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-8">
      <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center">
        <MessageSquare className="h-5 w-5 text-green-600 dark:text-green-400" />
      </div>
      <div>
        <h1 className="text-lg font-medium text-foreground">New Message</h1>
        <p className="text-sm text-muted-foreground mt-1">Start a new conversation.</p>
      </div>
    </div>
  )
}

export default NewMessagePage
