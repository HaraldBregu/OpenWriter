import React from 'react'
import { Newspaper } from 'lucide-react'

const NewPostPage: React.FC = () => {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-8">
      <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
        <Newspaper className="h-5 w-5 text-purple-600 dark:text-purple-400" />
      </div>
      <div>
        <h1 className="text-lg font-medium text-foreground">New Post</h1>
        <p className="text-sm text-muted-foreground mt-1">Start writing your next post.</p>
      </div>
    </div>
  )
}

export default NewPostPage
