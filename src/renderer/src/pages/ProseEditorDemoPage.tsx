import { useState, useCallback } from 'react'
import { Type } from 'lucide-react'
import { ProseEditor } from '@/components/app'

const INITIAL_HTML = `<h1>ProseEditor Demo</h1>
<p>This is a <strong>full-featured</strong> ProseMirror editor built directly on the core ProseMirror packages. Try out all the features below!</p>
<h2>Formatting</h2>
<p>Select text to see the <em>floating toolbar</em>. You can toggle <strong>bold</strong>, <em>italic</em>, <u>underline</u>, <s>strikethrough</s>, and <code>inline code</code>.</p>
<h2>Keyboard Shortcuts</h2>
<ul>
<li><strong>Mod-B</strong> — Bold</li>
<li><strong>Mod-I</strong> — Italic</li>
<li><strong>Mod-U</strong> — Underline</li>
<li><strong>Mod-\`</strong> — Inline Code</li>
<li><strong>Mod-Shift-S</strong> — Strikethrough</li>
<li><strong>Mod-Z / Mod-Y</strong> — Undo / Redo</li>
<li><strong>Tab / Shift-Tab</strong> — Indent / Outdent in lists</li>
</ul>
<h2>Input Rules</h2>
<p>Type these at the start of a line:</p>
<ol>
<li><code># </code> through <code>###### </code> for headings</li>
<li><code>&gt; </code> for blockquote</li>
<li><code>- </code> or <code>* </code> for bullet list</li>
<li><code>1. </code> for ordered list</li>
<li><code>---</code> for horizontal rule</li>
<li><code>\`\`\`</code> for code block</li>
</ol>
<blockquote><p>This is a blockquote. It has a left border and muted styling.</p></blockquote>
<h3>Code Block</h3>
<pre><code>function greet(name: string) {
  return \`Hello, \${name}!\`
}</code></pre>
<hr>
<p>Start editing to explore all features!</p>`

export default function ProseEditorDemoPage() {
  const [html, setHtml] = useState(INITIAL_HTML)
  const [showSource, setShowSource] = useState(false)

  const handleChange = useCallback((value: string) => {
    setHtml(value)
  }, [])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-3 border-b shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Type className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-lg font-semibold">ProseEditor Demo</h1>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowSource(false)}
              className={`px-3 py-1 text-xs rounded-md border transition-colors ${
                !showSource
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              Editor
            </button>
            <button
              type="button"
              onClick={() => setShowSource(true)}
              className={`px-3 py-1 text-xs rounded-md border transition-colors ${
                showSource
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              HTML Source
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {showSource ? (
          <div className="p-6">
            <pre className="p-4 rounded-lg border bg-muted/20 text-xs font-mono overflow-auto max-h-[calc(100vh-10rem)] whitespace-pre-wrap break-all text-muted-foreground">
              {html}
            </pre>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-6 py-4">
            <ProseEditor
              value={html}
              onChange={handleChange}
              placeholder="Start writing..."
              autoFocus
            />
          </div>
        )}
      </div>
    </div>
  )
}
