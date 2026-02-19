import React, { useState } from 'react'
import { Newspaper, Send } from 'lucide-react'

const NewPostPage: React.FC = () => {
  const [text, setText] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleCallAgent = async () => {
    if (!text.trim()) return

    setIsLoading(true)
    try {
      // TODO: Call agent API
      console.log('Calling agent with text:', text)
    } catch (error) {
      console.error('Error calling agent:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleCallAgent()
    }
  }

  return (
    <div className="h-full flex flex-col gap-4 p-6">
      {/* Header */}
      <div className="flex flex-col items-center gap-3 text-center pb-6 border-b border-border">
        <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
          <Newspaper className="h-5 w-5 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h1 className="text-lg font-medium text-foreground">New Post</h1>
          <p className="text-sm text-muted-foreground mt-1">Start writing your next post.</p>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Empty state or content will go here */}
        <div className="flex-1" />
      </div>

      {/* Input Section */}
      <div className="flex flex-col gap-3 border-t border-border pt-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write your post content... (Ctrl+Enter to submit)"
          className="flex-1 w-full min-h-24 p-3 rounded-lg border border-input bg-background text-foreground placeholder-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={handleCallAgent}
          disabled={!text.trim() || isLoading}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-muted disabled:text-muted-foreground text-white rounded-lg font-medium transition-colors"
        >
          <Send className="h-4 w-4" />
          {isLoading ? 'Processing...' : 'Call Agent'}
        </button>
      </div>
    </div>
  )
}

export default NewPostPage
