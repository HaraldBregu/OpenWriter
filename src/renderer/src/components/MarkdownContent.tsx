import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useIsDark } from '../hooks/useIsDark'
import { CopyButton } from './CopyButton'

interface MarkdownContentProps {
  content: string
  isUser?: boolean
}

export const MarkdownContent = React.memo(function MarkdownContent({
  content,
  isUser = false
}: MarkdownContentProps) {
  const isDark = useIsDark()
  const codeTheme = isDark ? oneDark : oneLight

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Paragraphs
        p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,

        // Headings
        h1: ({ children }) => <h1 className="text-xl font-bold mb-2 mt-3 first:mt-0">{children}</h1>,
        h2: ({ children }) => <h2 className="text-lg font-semibold mb-2 mt-3 first:mt-0">{children}</h2>,
        h3: ({ children }) => <h3 className="text-base font-semibold mb-1 mt-2 first:mt-0">{children}</h3>,

        // Lists
        ul: ({ children }) => <ul className="list-disc list-outside pl-4 mb-2 space-y-0.5">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-outside pl-4 mb-2 space-y-0.5">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,

        // Inline formatting
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,

        // Blockquote
        blockquote: ({ children }) => (
          <blockquote className={`border-l-2 pl-3 my-2 italic ${isUser ? 'border-white/40 opacity-80' : 'border-border opacity-70'}`}>
            {children}
          </blockquote>
        ),

        // Links
        a: ({ href, children }) => (
          <a
            href={href}
            onClick={(e) => { e.preventDefault(); if (href) window.open(href) }}
            className="underline underline-offset-2 hover:opacity-75 transition-opacity cursor-pointer"
          >
            {children}
          </a>
        ),

        // Horizontal rule
        hr: () => <hr className="my-3 border-current opacity-20" />,

        // Table
        table: ({ children }) => (
          <div className="overflow-x-auto my-2">
            <table className="w-full text-xs border-collapse">{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th className={`px-3 py-1.5 text-left font-semibold border ${isUser ? 'border-white/20' : 'border-border'}`}>
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className={`px-3 py-1.5 border ${isUser ? 'border-white/20' : 'border-border'}`}>
            {children}
          </td>
        ),

        // Code — inline vs block
        code: ({ className, children, ...props }) => {
          const match = /language-(\w+)/.exec(className || '')

          if (!match) {
            // Inline code
            return (
              <code
                className={`rounded px-1 py-0.5 text-xs font-mono ${
                  isUser ? 'bg-black/20' : 'bg-muted text-foreground'
                }`}
                {...props}
              >
                {children}
              </code>
            )
          }

          // Fenced code block
          const codeStr = String(children).replace(/\n$/, '')
          return (
            <div className="relative group/code my-2 rounded-md text-xs">
              <CopyButton text={codeStr} />
              <SyntaxHighlighter
                style={codeTheme}
                language={match[1]}
                PreTag="div"
                customStyle={{
                  margin: 0,
                  borderRadius: '0.375rem',
                  fontSize: '0.75rem',
                  padding: '0.75rem 1rem',
                  overflowX: 'auto'
                }}
              >
                {codeStr}
              </SyntaxHighlighter>
            </div>
          )
        }
      }}
    >
      {content}
    </ReactMarkdown>
  )
})
