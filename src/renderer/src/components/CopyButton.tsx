import React, { useState } from 'react'
import { Copy, Check } from 'lucide-react'

/** One-shot copy-to-clipboard button. */
export const CopyButton = React.memo(function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    window.api.clipboardWriteText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="absolute top-2 right-2 flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground/60 hover:text-muted-foreground bg-muted/60 hover:bg-muted transition-colors opacity-0 group-hover/code:opacity-100"
      title="Copy code"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
})
