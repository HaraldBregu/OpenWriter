import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import {
  type DragHandlePluginProps,
  type NestedOptions,
  defaultComputePositionConfig,
  DragHandlePlugin,
  dragHandlePluginDefaultKey,
  normalizeNestedOptions,
} from '@tiptap/extension-drag-handle'
import type { Node } from '@tiptap/pm/model'
import type { Plugin } from '@tiptap/pm/state'
import type { Editor } from '@tiptap/core'

type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>

export type DragHandleProps = Omit<
  Optional<DragHandlePluginProps, 'pluginKey'>,
  'element' | 'nestedOptions'
> & {
  className?: string
  onNodeChange?: (data: { node: Node | null; editor: Editor; pos: number }) => void
  children: ReactNode
  nested?: boolean | NestedOptions
}

export function DragHandle(props: DragHandleProps): React.JSX.Element {
  const {
    className = 'drag-handle',
    children,
    editor,
    pluginKey = dragHandlePluginDefaultKey,
    onNodeChange,
    onElementDragStart,
    onElementDragEnd,
    computePositionConfig = defaultComputePositionConfig,
    nested = false,
  } = props

  const [element, setElement] = useState<HTMLDivElement | null>(null)
  const plugin = useRef<Plugin | null>(null)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const nestedOptions = useMemo(() => normalizeNestedOptions(nested), [JSON.stringify(nested)])

  useEffect(() => {
    let initPlugin: { plugin: Plugin; unbind: () => void } | null = null

    if (!element) {
      return () => { plugin.current = null }
    }

    if (editor.isDestroyed) {
      return () => { plugin.current = null }
    }

    if (!plugin.current) {
      initPlugin = DragHandlePlugin({
        editor,
        element,
        pluginKey,
        computePositionConfig: {
          ...defaultComputePositionConfig,
          ...computePositionConfig,
        },
        onElementDragStart,
        onElementDragEnd,
        onNodeChange,
        nestedOptions,
      })
      plugin.current = initPlugin.plugin

      editor.registerPlugin(plugin.current)
    }

    return () => {
      editor.unregisterPlugin(pluginKey)
      plugin.current = null
      if (initPlugin) {
        initPlugin.unbind()
        initPlugin = null
      }
    }
  }, [
    element,
    editor,
    onNodeChange,
    pluginKey,
    computePositionConfig,
    onElementDragStart,
    onElementDragEnd,
    nestedOptions,
  ])

  return (
    <div
      className={className}
      style={{ visibility: 'hidden', position: 'absolute' }}
      data-dragging="false"
      ref={setElement}
    >
      {children}
    </div>
  )
}
