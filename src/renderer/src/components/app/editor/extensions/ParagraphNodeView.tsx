import React from 'react'
import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { cn } from '@/lib/utils'

export interface ParagraphNodeViewCallbacks {
  onAddBelow?: (pos: number) => void
  onDelete?: (pos: number) => void
  onEnhance?: (pos: number) => void
}

export function ParagraphNodeView(_props: NodeViewProps): React.JSX.Element {
  return (
    <NodeViewWrapper as="div" data-type="paragraph">
      <NodeViewContent
        className={cn(
          'block',
          'text-lg leading-relaxed text-foreground break-words',
          'm-0 p-0',
        )}
      />
    </NodeViewWrapper>
  )
}
