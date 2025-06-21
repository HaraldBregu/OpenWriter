import { BubbleMenu, Editor, EditorContent, useEditor } from '@tiptap/react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from './ui/dropdown-menu'
import Button from './ui/button'
import {
  ForwardedRef,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState
} from 'react'
import { defaultEditorConfig } from '@/lib/tiptap/editor-configs'
import { HistoryState } from '@/pages/editor/hooks/useHistoryState'
import { useEditorHistory } from '@/hooks/use-editor-history'
import { v4 as uuidv4 } from 'uuid'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { LigatureType } from '@/lib/tiptap/ligature-mark'
import { Mark } from 'prosemirror-model'
import { textTemplate } from '@/lib/tiptap/templates-mock'
import { Node } from 'prosemirror-model'

export interface EditorData {
  json: object
  html: string
  text: string
  characters: number
  words: number
}

export interface HTMLTextEditorElement {
  setEditable: (value: boolean) => void
  setHeadingLevel: (level: number) => TTextPosition | undefined
  setBody: (style?: Style) => void
  setFontFamily: (fontFamily: string) => void
  setFontSize: (fontSize: string) => void
  setBold: (bold: boolean) => void
  setItalic: (italic: boolean) => void
  setUnderline: (underline: boolean) => void
  setTextColor: (color: string) => void
  setHighlightColor: (color: string) => void
  setBlockquote: (isBlockquote: boolean) => void
  setTextAlignment: (alignment: string) => void
  setLineSpacing: (lineSpacing: Spacing) => void
  setListStyle: (bulletStyle: BulletStyle) => void
  toggleNonPrintingCharacters: () => void
  setListNumbering: (numbering: number) => void
  continuePreviousNumbering: () => void
  setStrikeThrough: (value: boolean) => void
  setSuperscript: (superscript: boolean) => void
  setSubscript: (subscript: boolean) => void
  undo: (action?: HistoryAction) => void
  redo: () => void
  addBookmark: () => void
  unsetBookmark: () => void
  deleteBookmarks: (bookmarks: Bookmark[]) => void
  scrollToBookmark: (id: string) => void
  addComment: () => void
  unsetComment: () => void
  deleteComments: (comments: AppComment[]) => void
  scrollToComment: (id: string) => void
  scrollToSection: (id: string) => void
  setLigature: (ligature: LigatureType) => void
  setCase: (caseType: CasingType) => void
  increaseIndent: () => void
  decreaseIndent: () => void
  increaseCharacterSpacing: () => void
  decreaseCharacterSpacing: () => void
  unsetCharacterSpacing: () => void
  scrollToHeadingIndex: (index: number) => void
  focus: () => void
  setTextSelection: (currentPosition: TTextPosition) => void
  insertCharacter: (character: number) => void
  chain: () => any
  getState: () => any
  getJSON: () => any
  getHTML: () => string | undefined
  setJSON: (data?: any) => void
  state: EditorData | undefined
}

interface TextEditorProps {
  className?: string
  isMainText?: boolean
  bubbleToolbarItems?: BubbleToolbarItem[]
  onUpdate?: (data: EditorData) => void
  onEmphasisStateChange?: (emphasisState: EmphasisState) => void
  onHistoryStateChange?: (historyState: HistoryState) => void
  onSelectedContentChange?: (selectedContent: string) => void
  onCanUndo?: (value: boolean) => void
  onCanRedo?: (value: boolean) => void
  onSelectionMarks?: (selectedMarks: any[]) => void
  bookmarkHighlighted?: boolean
  onChangeBookmarks?: (bookmarks: any[]) => void
  onChangeComments?: (comments: any[]) => void
  onChangeBookmark?: (bookmark: any) => void
  commentHighlighted?: boolean
  onChangeComment?: (comment: any) => void
  onSelectedContent?: (selectedContent: string) => void
  onFocusEditor?: () => void
  onBookmarkStateChange?: (active: boolean) => void
  onCommentStateChange?: (active: boolean) => void
  onBookmarkCreated?: (id: string, content: string) => void
  onCommentCreated?: (id: string, content: string) => void
  onCurrentSection?: (section?: string) => void
}

const TextEditor = forwardRef(
  (
    {
      className,
      isMainText = false,
      bubbleToolbarItems,
      onUpdate,
      onEmphasisStateChange,
      onHistoryStateChange,
      onSelectedContentChange,
      onCanUndo,
      onCanRedo,
      bookmarkHighlighted,
      onChangeBookmarks,
      onChangeComments,
      onSelectionMarks,
      onChangeBookmark,
      commentHighlighted,
      onChangeComment,
      onSelectedContent,
      onFocusEditor,
      onBookmarkStateChange,
      onCommentStateChange,
      onBookmarkCreated,
      onCommentCreated,
      onCurrentSection
    }: TextEditorProps,
    ref: ForwardedRef<HTMLTextEditorElement>
  ) => {
    const { t } = useTranslation()

    const withSectionDividers: boolean = isMainText
    const withEditableFilter: boolean = isMainText

    const content = useMemo(() => {
      if (isMainText) {
        return {
          type: 'doc',
          content: [...textTemplate(t('dividerSections.mainText'))]
        }
      }

      return {
        type: 'doc',
        content: []
      }
    }, [isMainText])

    const editor = useEditor({
      ...defaultEditorConfig(withSectionDividers, withEditableFilter),
      content: content,
      editorProps: {
        // attributes: {
        //   style: 'font-family: "Times New Roman", Arial, sans-serif;'
        // },
        handleKeyDown: (view, event) => {
          if (event.key === 'Enter') {
            const { state } = view
            const { selection } = state
            const { $from } = selection

            if ($from.parent.type.name.startsWith('heading')) {
            }
          }
          const isMacOS = /Mac/.test(navigator.userAgent)

          if (isMacOS) {
            // Gestione per Cmd+V su macOS
            if (event.metaKey && event.key === 'v' && editor?.isFocused) {
              event.preventDefault()
              handlePaste()
            }

            // Gestione per Cmd+C su macOS
            if (event.metaKey && event.key === 'c' && editor?.isFocused) {
              event.preventDefault()
              handleCopy()
            }

            if (event.metaKey && event.key === 'x' && editor?.isFocused) {
              event.preventDefault()
              handleCut()
            }
          }
          return false
        }
      },
      onUpdate: ({ editor }) => {
        const newState = currentEditorState()
        onUpdate?.(newState)

        const bookmarks = handleMarks(editor, 'bookmark')
        onChangeBookmarks?.(bookmarks)

        const comments = handleMarks(editor, 'comment')
        onChangeComments?.(comments)

       //updateEmphasisState(editor)
      },
      onSelectionUpdate: ({ editor }) => {
        const state = editor.state
        const { selection } = state
        const { from, to } = selection
        const selectedContent = state.doc.textBetween(from, to, ' ')

        // POPOVER
        if (from === to) setPopoverOpen(false)

        // SECTIONS
        let sections: string[] = []
        editor.state.doc.nodesBetween(0, from, (node, _) => {
          if (node.type.name === 'sectionDivider') {
            sections.push(node.attrs.sectionType)
            return false
          }
          return true
        })
        const currentSection = sections[sections.length - 1]
        onCurrentSection?.(sections.length > 0 ? currentSection : undefined)

        // SELECTION MARKS
        const selectedMarks = getSelectionMarks(editor)
        if (selectedContent.length === 0) {
          const hasBookmark = selectedMarks.some((mark) => mark.type === 'bookmark')
          const hasComment = selectedMarks.some((mark) => mark.type === 'comment')
          if (hasComment && commentHighlighted) {
            onSelectionMarks?.(selectedMarks.filter((mark) => mark.type === 'comment'))
          } else if (hasBookmark && bookmarkHighlighted) {
            onSelectionMarks?.(selectedMarks.filter((mark) => mark.type === 'bookmark'))
          } else {
            onSelectionMarks?.([])
          }
        } else {
          onSelectionMarks?.(selectedMarks)
        }

        const comments = handleMarks(editor, 'comment')
        onChangeComments?.(comments)
        const bookmarks = handleMarks(editor, 'bookmark')
        onChangeBookmarks?.(bookmarks)

        // SELECT COMMENT
        const selectedComment = comments.find((comment) => {
          return selectedMarks.some(
            (mark) => mark.type === 'comment' && mark.attrs?.id === comment.id
          )
        })
        if (selectedComment) onChangeComment?.(selectedComment)

        // SELECT BOOKMARK
        const selectedBookmark = bookmarks.find((bookmark) => {
          return selectedMarks.some(
            (mark) => mark.type === 'bookmark' && mark.attrs?.id === bookmark.id
          )
        })
        if (selectedBookmark) onChangeBookmark?.(selectedBookmark)

        onSelectedContent?.(selectedContent)
        onSelectedContentChange?.(selectedContent)
        onCanUndo?.(editor.can().undo())
        onCanRedo?.(editor.can().redo())
        //updateEmphasisState(editor)
        onBookmarkStateChange?.(editor.isActive('bookmark'))
        onCommentStateChange?.(editor.isActive('comment'))
      },
      onTransaction: ({ editor, transaction }) => {
        onHistoryStateChange?.(editorHistory.current)
        const selectionStart = transaction.getMeta('selectionStart')
        const selectionEnd = transaction.getMeta('selectionEnd')

        if (selectionStart) 
          setPopoverOpen(false)
        
        if (selectionEnd) {
          // updateEmphasisState(editor)
          setTimeout(() => {
            positionPopover()
          }, 0)
        }
      },
      onFocus: (data) => {
        const editor = data.editor
        onFocusEditor?.()
        onCanUndo?.(editor.can().undo())
        onCanRedo?.(editor.can().redo())
      },
      onPaste: (event, slice) => {
      }
    })

    if (!editor) {
      throw new Error('Editor not found')
    }

    useImperativeHandle(ref, () => {
      return {
        setEditable: (value: boolean) => {
          editor.setEditable(value)
        },
        setHeadingLevel: (level: number) => {
          const { from, to } = editor.state.selection
          editor
            .chain()
            .focus()
            .selectParentNode()
            .unsetMark('textStyle')
            .setHeading({ level: level as 1 | 2 | 3 | 4 | 5 | 6 })
            .run()
          editorHistory.trackHistoryActions('headingStyle', `Changed heading level to ${level}`)
          return { from, to } as TTextPosition
        },
        setBody: (style?: Style) => {
          // editor?.commands.setCallout({ type: 'warning' })
          if (!editor) return

          const command = editor.chain().focus().setParagraph()

          if (!style) {
            command.run()
          } else {
            command.setMark('textStyle', style).run()
          }

          editorHistory.trackHistoryActions('paragraphStyle', `Changed heading level to paragraph`)
        },
        setFontFamily: (fontFamily: string) => {
          const isHeading = editor.isActive('heading')
          const heading = editor.getAttributes('heading')
          const fontSize = editor.getAttributes('textStyle').fontSize
          editor
            .chain()
            .focus()
            .setMark('textStyle', {
              ...editor.getAttributes('textStyle'),
              fontSize: isHeading ? heading.fontSize : fontSize
            })
            .setFontFamily(fontFamily)
            .run()
          editorHistory.trackHistoryActions(
            'characterStyle',
            `Changed font family to ${fontFamily}`
          )
        },
        setFontSize: (fontSize: string) => {
          editor.chain().focus().setMark('textStyle', { fontSize: fontSize }).run()
          editorHistory.trackHistoryActions('characterStyle', `Changed font size to ${fontSize}`)
        },
        setBold: (bold: boolean) => {
          editor.chain().focus()[bold ? 'setBold' : 'unsetBold']().run()
          editorHistory.trackHistoryActions('characterStyle', `Applied bold style`)
        },
        setItalic: (italic: boolean) => {
          editor.chain().focus()[italic ? 'setItalic' : 'unsetItalic']().run()
          editorHistory.trackHistoryActions('characterStyle', `Applied italic style`)
        },
        setUnderline: (underline: boolean) => {
          editor.chain().focus()[underline ? 'setUnderline' : 'unsetUnderline']().run()
          editorHistory.trackHistoryActions('characterStyle', `Applied underline style`)
        },
        setTextColor: (color: string) => {
          const isHeading = editor?.isActive('heading')
          const heading = editor?.getAttributes('heading')
          const fontSize = editor?.getAttributes('textStyle').fontSize
          const headingFontSize = heading?.fontSize ?? '18pt'
          editor
            .chain()
            .focus()
            .setMark('textStyle', {
              ...editor.getAttributes('textStyle'),
              fontSize: isHeading ? headingFontSize : fontSize,
              color: color
            })
            .run()
          editorHistory.trackHistoryActions('characterStyle', `Applied text color`)
        },
        setHighlightColor: (color: string) => {
          editor.chain().focus().setHighlight({ color: color }).run()
          editorHistory.trackHistoryActions('characterStyle', `Applied highlight color`)
        },
        setBlockquote: (isBlockquote: boolean) => {
          editor.chain().focus()[isBlockquote ? 'setBlockquote' : 'unsetBlockquote']().run()
          editorHistory.trackHistoryActions('characterStyle', `Applied blockquote style`)
        },
        setTextAlignment: (alignment: string) => {
          editor.chain().focus().setTextAlign(alignment).run()
          editorHistory.trackHistoryActions('characterStyle', `Applied font alignment`)
        },
        setLineSpacing: (lineSpacing: Spacing) => {
          editor.chain().focus().setLineSpacing(lineSpacing).run()
          editorHistory.trackHistoryActions('characterStyle', `Applied line spacing`)
        },
        setListStyle: (bulletStyle: BulletStyle) => {
          const { type, style } = bulletStyle

          const bulletListActive = editor?.isActive('bulletedList')
          const orderListActive = editor?.isActive('orderList')

          switch (type) {
            case 'ORDER':
              if (orderListActive) {
                editor?.chain().focus().updateAttributes('orderList', { listStyle: style }).run()
              } else {
                editor?.chain().focus().toggleOrderList(style).run()
              }
              break
            case 'BULLET':
              if (bulletListActive) {
                editor?.chain().focus().updateAttributes('bulletedList', { listStyle: style }).run()
              } else {
                editor?.chain().focus().toggleBulletedList(style).run()
              }
              break
            default:
              if (bulletListActive) {
                editor?.chain().focus().unsetBulletList().run()
              }

              if (orderListActive) {
                editor?.chain().focus().unsetOrderList().run()
              }
              break
          }

          editorHistory.trackHistoryActions(
            'characterStyle',
            `Applied ${type.toLowerCase()} list with ${style} style`
          )
        },
        toggleNonPrintingCharacters: () => {
          editor?.chain().focus().toggleNonPrintingCharacters()
        },
        setListNumbering: (numbering: number) => {
          if (editor.isActive('orderList')) {
            editor.chain().focus().updateAttributes('orderList', { start: numbering }).run()
          } else {
            editor
              .chain()
              .focus()
              .toggleOrderList('decimal')
              .updateAttributes('orderList', { start: numbering })
              .run()
          }
          editorHistory.trackHistoryActions(
            'characterStyle',
            `Applied list numbering resuming from ${numbering}`
          )
        },
        continuePreviousNumbering: () => {
          editor.chain().focus().continueFromPreviousNumber().run()
          editorHistory.trackHistoryActions('characterStyle', `Continued previous numbering`)
        },
        setStrikeThrough: (value: boolean) => {
          editor.chain().focus()[value ? 'setStrike' : 'unsetStrike']().run()
          editorHistory.trackHistoryActions('characterStyle', `Applied strikethrough style`)
        },
        setSuperscript: (superscript: boolean) => {
          editor.chain().focus().unsetSubscript().run()
          editor.chain().focus()[superscript ? 'setSuperscript' : 'unsetSuperscript']().run()
          setTimeout(() => {
            if (editor) {
              // updateEmphasisState(editor)
            }
          })
          editorHistory.trackHistoryActions('characterStyle', `Applied superscript style`)
        },
        setSubscript: (subscript: boolean) => {
          editor.chain().focus().unsetSuperscript().run()
          editor.chain().focus()[subscript ? 'setSubscript' : 'unsetSubscript']().run()
          setTimeout(() => {
            if (editor) {
              // updateEmphasisState(editor)
            }
          })
          editorHistory.trackHistoryActions('characterStyle', `Applied subscript style`)
        },
        undo: (action?: HistoryAction) => {
          if (action && action.id) {
            editorHistory.restoreToAction(action)
            editor?.commands.setContent(action.content, false)
          } else if (editor?.can().undo()) {
            editor?.chain().focus().undo().run()
          }
        },
        redo: () => {
          const canRedo = editor?.can().redo()
          if (!canRedo) return
          editor?.chain().focus().redo().run()
        },
        addBookmark: () => {
          editor.chain().focus().unsetHighlight().run()

          const bookmarkColor = bookmarkHighlighted ? '#E5E5E5' : '#ffffff'
          const id = uuidv4()
          editor.chain().focus().setBookmark({ id: id, color: bookmarkColor }).run()

          const { from, to } = editor.state.selection
          const selectedContent = editor.state.doc.textBetween(from, to, ' ')

          if (selectedContent.length > 0) {
            onBookmarkCreated?.(id, selectedContent)
          }
        },
        unsetBookmark: () => {
          editor.chain().focus().unsetBookmark().run()
        },
        deleteBookmarks: (bookmarks: Bookmark[]) => {
          const bookmarkIds = bookmarks.map((bookmark) => bookmark.id)
          deleteMarks(editor, bookmarkIds, 'bookmark')
        },
        scrollToBookmark: (id: string) => {
          const positions: { start: number; end: number }[] = []
          editor.state.doc.descendants((node: any, pos: number) => {
            if (node.marks?.some((mark) => mark.type.name === 'bookmark' && mark.attrs.id === id)) {
              positions.push({
                start: pos,
                end: pos + node.nodeSize
              })
            }
          })

          let pos: { start: number; end: number } | null = null
          if (positions.length > 0) {
            const minStart = Math.min(...positions.map((p) => p.start))
            const maxEnd = Math.max(...positions.map((p) => p.end))
            pos = { start: minStart, end: maxEnd }
          }

          if (!pos) return

          const coords = editor?.view.coordsAtPos(pos.start)
          const element = editor.view.dom

          const scrollTop = coords.top - element.getBoundingClientRect().top + element.scrollTop

          element.scrollTo({
            top: scrollTop,
            behavior: 'smooth'
          })

          setTimeout(() => {
            editor?.commands.setTextSelection({ from: pos.start, to: pos.end })
            editor?.commands.focus()
          }, 600)
        },
        addComment: () => {
          editor.chain().focus().unsetHighlight().run()

          const commentColor = commentHighlighted ? '#A9BFFF' : '#ffffff'

          const id = uuidv4()
          editor.chain().focus().setComment({ id: id, color: commentColor }).run()

          const { from, to } = editor.state.selection
          const selectedContent = editor.state.doc.textBetween(from, to, ' ')

          if (selectedContent.length > 0) {
            onCommentCreated?.(id, selectedContent)
          }
        },
        unsetComment: () => {
          editor.chain().focus().unsetComment().run()
        },
        deleteComments: (comments: AppComment[]) => {
          const commentIds = comments.map((comment) => comment.id)
          deleteMarks(editor, commentIds, 'comment')
        },
        scrollToComment: (id: string) => {
          const positions: { start: number; end: number }[] = []
          editor.state.doc.descendants((node: any, pos: number) => {
            if (node.marks?.some((mark) => mark.type.name === 'comment' && mark.attrs.id === id)) {
              positions.push({
                start: pos,
                end: pos + node.nodeSize
              })
            }
          })

          let pos: { start: number; end: number } | null = null
          if (positions.length > 0) {
            const minStart = Math.min(...positions.map((p) => p.start))
            const maxEnd = Math.max(...positions.map((p) => p.end))
            pos = { start: minStart, end: maxEnd }
          }

          if (!pos) return

          const coords = editor?.view.coordsAtPos(pos.start)
          const element = editor.view.dom

          const scrollTop = coords.top - element.getBoundingClientRect().top + element.scrollTop

          element.scrollTo({
            top: scrollTop,
            behavior: 'smooth'
          })

          setTimeout(() => {
            editor?.commands.setTextSelection({ from: pos.start, to: pos.end })
            editor?.commands.focus()
          }, 600)
        },
        scrollToSection: (id: string) => {
          const _id = id ?? 'toc'

          function findNodePositionByAttribute(editor: Editor): number[] {
            const positions: number[] = []
            editor.state.doc.descendants((node: any, pos: number) => {
              if (node.type.name === 'sectionDivider' && node.attrs?.sectionType === _id) {
                positions.push(pos)
              }
            })
            return positions
          }

          const positions = findNodePositionByAttribute(editor)
          if (positions.length === 0) {
            console.warn(`No section found with type: ${_id}`)
            return
          }

          const pos = Math.min(...positions)

          editor?.commands.setTextSelection(pos + 1)
          editor?.commands.focus()
          setTimeout(() => {
            editor?.commands.scrollIntoView()
          }, 50)
        },
        setLigature: (ligature: LigatureType) => {
          editor.chain().focus().setLigature(ligature).run()
        },
        setCase: (caseType: CasingType) => {
          const { state } = editor
          const { selection } = state
          const { from, to } = selection

          let commandChain = editor.chain()

          // Apply transformation to all text nodes in selection, preserving marks/nodes
          state.doc.nodesBetween(from, to, (node, pos) => {
            if (node.isText) {
              const nodeFrom = Math.max(pos, from)
              const nodeTo = Math.min(pos + node.nodeSize, to)
              const sliceFrom = nodeFrom - pos
              const sliceTo = nodeTo - pos
              const original = node.text?.slice(sliceFrom, sliceTo) ?? ''
              const transformed = transformText(caseType, original)

              // Create a position object for the text node
              const position = {
                from: nodeFrom,
                to: nodeTo
              }

              // Replace only the selected part of the text node
              commandChain = commandChain
                .insertContentAt(position, transformed)
                .setTextSelection(position)
              // If you want to support small-caps, implement it via a mark or style here.
              if (caseType === 'small-caps') {
                // Apply small-caps by setting the fontVariant property via textStyle mark
                commandChain = commandChain.setMark('textStyle', {
                  ...editor.getAttributes('textStyle'),
                  fontVariant: 'small-caps'
                })
              } else {
                // Remove small-caps by unsetting fontVariant from textStyle mark
                const attrs = { ...editor.getAttributes('textStyle') }
                delete attrs.fontVariant
                commandChain = commandChain.unsetMark('textStyle').setMark('textStyle', attrs)
              }
            }
          })

          return commandChain
            .setTextSelection({
              from,
              to
            })
            .run()
        },
        increaseIndent: () => {
          editor?.chain().focus().increaseIndent().run()
        },
        decreaseIndent: () => {
          editor?.chain().focus().decreaseIndent().run()
        },
        increaseCharacterSpacing: () => {
          editor?.chain().focus().increaseCharacterSpacing().run()
        },
        decreaseCharacterSpacing: () => {
          editor?.chain().focus().decreaseCharacterSpacing().run()
        },
        unsetCharacterSpacing: () => {
          editor?.chain().focus().unsetCharacterSpacing().run()
        },
        scrollToHeadingIndex: (index: number) => {
          const textEditorJson = editor.getJSON()
          const items = textEditorJson.content || []
          if (items.length === 0) return

          const startIndex = items.findIndex(
            (item) =>
              item &&
              item.type === 'sectionDivider' &&
              item.attrs &&
              typeof item.attrs.sectionType === 'string' &&
              item.attrs.sectionType === 'maintext'
          )

          if (startIndex === -1) return

          const endIndex = items.findIndex(
            (_, idx) =>
              idx > startIndex &&
              items[idx] &&
              items[idx].type === 'sectionDivider' &&
              items[idx].attrs &&
              typeof items[idx].attrs.sectionType === 'string'
          )

          const finalEnd = endIndex === -1 ? items.length : endIndex

          const mainTextNodes = items.slice(startIndex + 1, finalEnd)

          if (!mainTextNodes || mainTextNodes.length === 0) return

          let positions: number[] = []
          editor?.state.doc.descendants((node, pos) => {
            if (node.type.name === 'heading') {
              const matchedNode = mainTextNodes.find(
                (n) =>
                  n.type === 'heading' &&
                  n.attrs?.level === node.attrs.level &&
                  n.content?.[0]?.text === node.textContent
              )
              if (matchedNode) positions.push(pos)
            }
            return true
          })

          const position = positions[index]
          const coords = editor?.view.coordsAtPos(position)
          const element = editor.view.dom

          const scrollTop = coords.top - element.getBoundingClientRect().top + element.scrollTop

          element.scrollTo({
            top: scrollTop,
            behavior: 'smooth'
          })
        },
        focus: () => {
          editor?.commands.focus()
        },
        setTextSelection: (currentPosition: TTextPosition) => {
          editor.commands.setTextSelection(currentPosition)
        },
        insertCharacter: (character: number) => {
          editor.chain().focus().insertContent(String.fromCharCode(character)).run()
        },
        chain: () => editor?.chain(),
        getState: () => editor?.state,
        getJSON: () => editor?.getJSON(),
        getHTML: () => editor?.getHTML(),
        setJSON: (data?: any) => {
          editor?.commands.setContent(data, true)
        },
        state: getEditorState()
      }
    }, [])

    function getEditorState() {
      const newState = currentEditorState()
      return newState
    }

    const handleMarks = useHandleMarks()
    const deleteMarks = useDeleteMarks()
    const getSelectionMarks = useGetSelectionMarks()

    const [selectionRange, setSelectionRange] = useState<{ from: number; to: number } | null>(null)

    // GET NODES FROM PARENT NODE TYPE
    const dataForNodeType = useCallback((editor: Editor, type: string) => {
      const { state } = editor
      const { from, to } = state.selection

      if (from === to)
        return {
          nodes: [],
          uniqueNodes: [],
          childNodes: [],
          uniqueChildNodes: [],
          marks: [],
          uniqueMarks: []
        }

      const nodes: Node[] = []
      const childNodes: Node[] = []
      const marks: Mark[] = []

      editor.state.doc.nodesBetween(from, to, (node: Node, _pos, parent: Node | null, _index) => {
        if (parent?.type.name === type) {
          nodes.push(parent)
          childNodes.push(node)
          marks.push(...node.marks)
        }
      })

      const uniqueNodes = nodes.filter(
        (item, index, self) =>
          index ===
          self.findIndex((obj) => JSON.stringify(obj.attrs) === JSON.stringify(item.attrs))
      )

      const uniqueChildNodes = childNodes.filter(
        (item, index, self) =>
          index ===
          self.findIndex((obj) => JSON.stringify(obj.attrs) === JSON.stringify(item.attrs))
      )

      const uniqueMarks = marks.filter(
        (mark, index, self) =>
          index === self.findIndex((obj) => JSON.stringify(obj) === JSON.stringify(mark))
      )

      return {
        nodes,
        uniqueNodes,
        childNodes,
        uniqueChildNodes,
        marks,
        uniqueMarks
      }
    }, [])

    const handleHeadingData = useCallback((editor: Editor) => {
      const { uniqueNodes, uniqueMarks } = dataForNodeType(editor, 'heading')

      const attributes = uniqueNodes.map((node) => node.attrs)

      const fontFamilies = attributes.map((attr) => attr.fontFamily)
      const fontSizes = attributes.map((attr) => attr.fontSize)

      const marksTextStyle = uniqueMarks.filter((data) => data.type.name === 'textStyle')

      const marksFontFamilies = marksTextStyle.flatMap((data) => data.attrs.fontFamily)
      const marksFontSizes = marksTextStyle.flatMap((data) => data.attrs.fontSize)

      const allFontFamilies = new Set([...fontFamilies, ...marksFontFamilies])
      const allFontSizes = new Set([...fontSizes, ...marksFontSizes])

      return {
        headingsTypes: uniqueNodes.length,
        hasHeadings: uniqueNodes.length > 0,
        hasOneHeading: uniqueNodes.length === 1,
        hasMultipleHeadingTypes: uniqueNodes.length > 1,
        headingFontFamilies: allFontFamilies,
        hasMultipleHeadingFontFamilies: allFontFamilies.size > 1,
        headingFontSizes: allFontSizes,
        hasMultipleHeadingFontSizes: allFontSizes.size > 1,
        headingFontSize: allFontSizes[0]
      }
    }, [])

    const handleParagraphData = useCallback((editor: Editor) => {
      const { nodes, uniqueNodes, uniqueMarks } = dataForNodeType(editor, 'paragraph')

      const attributes = uniqueNodes.map((node) => node.attrs)

      const fontFamilies = attributes.map((attr) => attr.fontFamily)
      const fontSizes = attributes.map((attr) => attr.fontSize)

      const marksTextStyle = uniqueMarks.filter((data) => data.type.name === 'textStyle')

      const marksFontFamilies = marksTextStyle.flatMap((data) => data.attrs.fontFamily)
      const marksFontSizes = marksTextStyle.flatMap((data) => data.attrs.fontSize)

      const allFontFamilies = new Set([...fontFamilies, ...marksFontFamilies])
      const allFontSizes = new Set([...fontSizes, ...marksFontSizes])

      return {
        paragraphLength: nodes.length,
        hasParagraphs: nodes.length > 0,
        paragraphFontFamilies: allFontFamilies,
        hasMultipleParagraphFontFamilies: allFontFamilies.size > 1,
        paragraphFontSizes: allFontSizes,
        hasMultipleParagraphFontSizes: allFontSizes.size > 1
      }
    }, [])

    const updateEmphasisState = useCallback((editor: Editor) => {
      const {
        hasHeadings,
        hasOneHeading,
        hasMultipleHeadingTypes,
        hasMultipleHeadingFontFamilies,
        hasMultipleHeadingFontSizes
      } = handleHeadingData(editor)
      const { hasParagraphs, hasMultipleParagraphFontFamilies, hasMultipleParagraphFontSizes } =
        handleParagraphData(editor)

      // Attributes
      const textStyle = editor.getAttributes('textStyle')
      const isHeading = editor.isActive('heading')
      const heading = editor.getAttributes('heading')
      const isBold = editor.isActive('bold')
      const isItalic = editor.isActive('italic')
      const isUnderLine = editor.isActive('underline')
      const isStrike = editor.isActive('strike')
      const isBlockquote = editor.isActive('note')
      const isCodeBlock = editor.isActive('codeBlock')

      // HEADING LEVEL
      const noHeadingLevel = hasMultipleHeadingTypes || (hasOneHeading && hasParagraphs)
      const currHeadingLevel = heading?.level ?? '0'
      const headingLevel = noHeadingLevel ? '-99' : currHeadingLevel

      // FONT FAMILY
      const noFontFamily = hasMultipleHeadingFontFamilies || hasMultipleParagraphFontFamilies
      const currFontFamily = textStyle?.fontFamily
      const fontFamily = noFontFamily ? '' : currFontFamily

      // FONT SIZE TODO: REFACTOR THIS PART (ADD GLOBAL FONT SIZE)
      const currTextFontSize = textStyle?.fontSize ?? '12pt'
      let currHeadingFontSize = '18pt'
      switch (heading.level) {
        case 1:
          currHeadingFontSize = textStyle?.fontSize ?? '18pt'
          break
        case 2:
          currHeadingFontSize = textStyle?.fontSize ?? '16pt'
          break
        case 3:
          currHeadingFontSize = textStyle?.fontSize ?? '14pt'
          break
        case 4:
          currHeadingFontSize = textStyle?.fontSize ?? '12pt'
          break
        case 5:
          currHeadingFontSize = textStyle?.fontSize ?? '10pt'
          break
      }

      const textFontSize = isHeading ? currHeadingFontSize : currTextFontSize
      const fontSize =
        hasMultipleHeadingFontSizes ||
          hasMultipleParagraphFontSizes ||
          (hasHeadings && hasParagraphs)
          ? '0pt'
          : textFontSize

      // TODO: REFACTOR THIS FUNCTION
      const { state } = editor
      const { from, to } = state.selection
      const getUniqueAttribute = <T extends number | string | null>(
        type: string,
        attributeName: string,
        defaultValue: T,
        nullReplacement: any = null
      ): T => {
        const attrs = new Set<T>()
        const markAttributes = editor.getAttributes(type)
        let attrValue =
          attributeName in markAttributes && markAttributes[attributeName]
            ? markAttributes[attributeName]
            : defaultValue
        if (from !== to) {
          editor.state.doc.nodesBetween(from, to, (node) => {
            if (node.marks) {
              node.marks.forEach((mark) => {
                if (mark.type.name === type && mark.attrs[attributeName]) {
                  let valueToAdd = mark.attrs[attributeName]
                  if (attributeName === 'fontSize' && typeof valueToAdd === 'string') {
                    const numericValue = parseFloat(valueToAdd)
                    if (!isNaN(numericValue)) {
                      valueToAdd = numericValue as unknown as T
                    }
                  }
                  attrs.add(valueToAdd as T)
                }
              })
            }
          })
          attrValue =
            attrs.size === 1 ? Array.from(attrs)[0] : attrs.size === 0 ? attrValue : nullReplacement
        }
        if (typeof defaultValue === 'number' && attrValue !== null) {
          attrValue = parseFloat(attrValue as unknown as string) as T
        }
        return attrValue
      }

      const bulletStyle = editor.getAttributes('bulletedList')?.listStyle || ''
      const orderListStyle = editor.getAttributes('orderList')?.listStyle || ''

      const newEmphasisState: EmphasisState = {
        headingLevel: headingLevel,
        fontFamily: fontFamily,
        fontSize: fontSize,
        bold: isBold,
        italic: isItalic,
        underline: isUnderLine,
        strikethrough: isStrike,

        // REVIEW THIS PART
        textColor: getUniqueAttribute<string>('textStyle', 'color', 'black', ''),
        highlight: getUniqueAttribute<string>('highlight', 'color', 'white', ''),

        // REVIEW THIS PART
        alignment: getUniqueAttribute<string>('paragraph', 'textAlign', 'left', ''),
        blockquote: isBlockquote,
        isCodeBlock: isCodeBlock,
        showNonPrintingCharacters: editor.storage.nonPrintingCharacter.visibility(),
        bulletStyle: {
          type: editor.isActive('bulletedList')
            ? 'BULLET'
            : editor.isActive('orderList')
              ? 'ORDER'
              : '',
          style: bulletStyle || orderListStyle,
          previousType: ''
        },
        superscript: editor.isActive('superscript'),
        subscript: editor.isActive('subscript'),
        spacing: {
          before: getUniqueAttribute<number | null>('paragraph', 'marginTop', null, null),
          after: getUniqueAttribute<number | null>('paragraph', 'marginBottom', null, null),
          line: getUniqueAttribute<number>('paragraph', 'lineHeight', 1, null)
        }
      }

      onEmphasisStateChange?.(newEmphasisState)
    }, [])

    // Add to your editor container
    // editor?.view.dom.addEventListener('copy', (event) => {
    //   const selection = editor?.state.selection
    //   const selectedContent = editor?.state.doc.cut(selection.from, selection.to)

    //   console.log('Copied content (ProseMirror):', selectedContent)
    //   // console.log('DOM structure of selection:', getSelectedDOMContent(editor))

    //   // You can also modify the clipboard data here
    //   // event.clipboardData.setData('text/html', customHTML)
    // })

    // editor?.view.dom.addEventListener('cut', (event) => {
    //   const selection = editor?.state.selection
    //   console.log('Cut operation - DOM before:', editor?.view.dom.innerHTML)

    //   // The actual cut will happen after this event
    //   setTimeout(() => {
    //     console.log('Cut operation - DOM after:', editor.view.dom.innerHTML)
    //   }, 0)
    // })

    const currentEditorState = useCallback(() => {
      const characters = editor.storage.characterCount.characters()
      const words = editor.storage.characterCount.words()

      return {
        json: editor.getJSON(),
        html: editor.getHTML(),
        text: editor.getText(),
        characters,
        words
      }
    },
      [editor]
    )


    const positionPopover = useCallback(() => {
      if (!editor || !editorRef.current) return

      const { view } = editor
      const { state } = view
      const { from, to } = state.selection

      if (from === to) return

      const start = view.coordsAtPos(from)
      const end = view.coordsAtPos(to)
      const editorRect = editorRef.current.getBoundingClientRect()
      const selectionCenter = (start.left + end.left) / 2
      const editorWidth = editorRect.width
      const isNearRightEdge = editorWidth - (selectionCenter - editorRect.left) < editorWidth / 2
      const top = start.top - editorRect.top - 70

      if (isNearRightEdge) {
        const right = editorWidth - (end.left - editorRect.left)
        setPopoverPosition({ top, right, left: undefined })
      } else {
        const left = selectionCenter - editorRect.left
        setPopoverPosition({ top, left, right: undefined })
      }
    }, [editor])

    const editorHistory = useEditorHistory(editor)

    const editorRef = useRef<HTMLDivElement>(null)
    const popoverTriggerRef = useRef<HTMLDivElement>(null)
    const [popoverOpen, setPopoverOpen] = useState(false)
    const [contextMenuOpen, setContextMenuOpen] = useState(false)
    const [popoverPosition, setPopoverPosition] = useState<{
      top: number
      left?: number
      right?: number
    }>({ top: 0, left: 0 })

    const handleCopy = useCallback(() => {
      if (!editor) return

      const { from, to } = editor.state.selection
      if (from === to) return

      const plainText = editor.state.doc.textBetween(from, to, ' ')
      if (plainText.length === 0) return

      const fragment = editor.state.selection.content()

      const domSerializer = editor.schema.cached.domSerializer
      const temp = document.createElement('div')
      const slice = fragment.content
      domSerializer.serializeFragment(slice, { document }, temp)
      const selectedHtml = temp.innerHTML

      navigator.clipboard
        .write([
          new ClipboardItem({
            'text/plain': new Blob([plainText], { type: 'text/plain' }),
            'text/html': new Blob([selectedHtml], { type: 'text/html' })
          })
        ])
        .catch((err) => {
          console.error('Clipboard write failed:', err)
          // Fallback sul metodo tradizionale
          document.execCommand('copy')
        })

      setContextMenuOpen(false)
    }, [editor])

    const handleCut = useCallback(() => {
      if (!editor) return

      const { from, to } = editor.state.selection
      if (from === to) return

      handleCopy()
      setTimeout(() => {
        editor.commands.deleteSelection()
      }, 0)

      setContextMenuOpen(false)
    }, [editor, handleCopy])

    const handlePaste = useCallback(async () => {
      if (!editor) return

      try {
        const clipboardItems = await navigator.clipboard.read()

        for (const clipboardItem of clipboardItems) {
          if (clipboardItem.types.includes('text/html')) {
            const blob = await clipboardItem.getType('text/html')
            const html = await blob.text()

            editor.commands.focus()
            editor.commands.insertContent(html, {
              parseOptions: {
                preserveWhitespace: 'full'
              }
            })
            break
          } else if (clipboardItem.types.includes('text/plain')) {
            const blob = await clipboardItem.getType('text/plain')
            const text = await blob.text()
            editor.commands.focus()
            editor.commands.insertContent(text)
            break
          }
        }
      } catch (error) {
        console.error('Failed to paste with rich content:', error)

        try {
          const text = await navigator.clipboard.readText()
          if (text.length > 0) {
            editor.commands.focus()
            editor.commands.insertContent(text)
          }
        } catch (fallbackError) {
          console.error('Clipboard paste failed:', fallbackError)
          const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform)
          const pasteKey = isMac ? 'Cmd+V' : 'Ctrl+V'
          alert(
            `Non è stato possibile incollare automaticamente. Utilizza ${pasteKey} per incollare.`
          )
        }
      }

      setContextMenuOpen(false)
    }, [editor])

    useEffect(() => {
      const handleClickOutside = () => {
        if (contextMenuOpen) {
          setContextMenuOpen(false)
        }
      }

      document.addEventListener('click', handleClickOutside)
      return () => {
        document.removeEventListener('click', handleClickOutside)
      }
    }, [contextMenuOpen])

    const handleKeyDown = useCallback(
      (event: KeyboardEvent) => {
        if (!editor || !selectionRange) return

        if ((event.key === 'Delete' || event.key === 'Backspace') && popoverOpen) {
          event.preventDefault()
          editor.commands.focus()
          const { from, to } = selectionRange
          editor.commands.deleteRange({ from, to })
          setPopoverOpen(false)
          setSelectionRange(null)
        }
      },
      [editor, selectionRange, popoverOpen]
    )

    const handleEditorKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === 'Tab' && editor?.isFocused) {
          e.preventDefault()
        }
      },
      [editor]
    )

    useEffect(() => {
      document.addEventListener('keydown', handleKeyDown)
      return () => {
        document.removeEventListener('keydown', handleKeyDown)
      }
    }, [handleKeyDown])

    useEffect(() => {
      if (popoverOpen && editor) {
        setTimeout(() => {
          editor.commands.focus()
        }, 10)
      }
    }, [popoverOpen, editor])

    useEffect(() => {
      if (!editor) return

      editor.state.doc.descendants((node, pos) => {
        if (node.marks) {
          node.marks.forEach((mark) => {
            if (mark.type.name == 'comment') {
              const commentColor = commentHighlighted ? '#A9BFFF' : 'transparent'
              editor
                .chain()
                .setTextSelection({ from: pos, to: pos + node.nodeSize })
                .updateCommentColor({ color: commentColor })
                .run()
            }
            if (mark.type.name == 'bookmark') {
              const bookmarkColor = bookmarkHighlighted ? '#E5E5E5' : 'transparent'
              editor
                .chain()
                .setTextSelection({ from: pos, to: pos + node.nodeSize })
                .updateBookmarkColor({ color: bookmarkColor })
                .run()
            }
          })
        }
        return true
      })
    }, [commentHighlighted, bookmarkHighlighted, editor])

    return (
      <>
        <div
          ref={editorRef}
          // className={cn('relative w-full h-full', className)}
          // onContextMenu={() => setPopoverOpen(true)}
        >
           <BubbleMenu
                editor={editor}
                tippyOptions={{
                    duration: 100,
                    placement: 'top'
                }}
                >
                  <div                   className="w-auto px-4 py-3"
                  >
                       <div className="flex items-center gap-2">
                    {bubbleToolbarItems?.map((item, index) => (
                      <div key={`${index}-${item.type}`}>
                        {item.type === 'button' && (
                          <Button
                            key={`${index}-${item.type}`}
                            intent="secondary"
                            variant="icon"
                            size="iconSm"
                            icon={item.icon}
                            onClick={() => {
                              item.onClick?.(item)
                              setPopoverOpen(false)
                            }}
                            disabled={item.disabled}
                          />
                        )}
                        {item.type === 'dropdown' && (!item.options || item.options.length < 2) && (
                          <Button
                            key={`${index}-${item.type}`}
                            intent="secondary"
                            variant="icon"
                            size="iconSm"
                            icon={item.icon}
                            onClick={() => {
                              item.onClick?.(item)
                              setPopoverOpen(false)
                            }}
                            disabled={item.disabled}
                          />
                        )}
                        {item.type === 'dropdown' && item.options && item.options.length > 1 && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                intent="secondary"
                                variant="icon"
                                size="iconSm"
                                icon={item.icon}
                                disabled={item.disabled}
                              />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="start"
                              className="w-[100px]"
                              onCloseAutoFocus={(e) => {
                                e.preventDefault()
                                editor?.commands.focus()
                              }}
                            >
                              {item.options?.map((option, index) => (
                                <DropdownMenuItem
                                  key={`${index}-${option.label}`}
                                  onClick={() => {
                                    item.onClick?.(option)
                                    setPopoverOpen(false)
                                  }}
                                >
                                  {option.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    ))}
                  </div>
                  </div>
                </BubbleMenu>

          {/* {bubbleToolbarItems && bubbleToolbarItems.length > 0 && (
            <div
              ref={popoverTriggerRef}
              style={{
                position: 'absolute',
                top: `${popoverPosition.top}px`,
                left: popoverPosition.left !== undefined ? `${popoverPosition.left}px` : undefined,
                right:
                  popoverPosition.right !== undefined ? `${popoverPosition.right}px` : undefined,
                width: '1px',
                height: '1px',
                pointerEvents: 'none'
              }}
            >
              <Popover
                open={popoverOpen}
                onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                  <div className="w-1 h-1" />
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto px-4 py-3"
                  onOpenAutoFocus={(e) => e.preventDefault()}
                >
                  <div className="flex items-center gap-2">
                    {bubbleToolbarItems?.map((item, index) => (
                      <div key={`${index}-${item.type}`}>
                        {item.type === 'button' && (
                          <Button
                            key={`${index}-${item.type}`}
                            intent="secondary"
                            variant="icon"
                            size="iconSm"
                            icon={item.icon}
                            onClick={() => {
                              item.onClick?.(item)
                              setPopoverOpen(false)
                            }}
                            disabled={item.disabled}
                          />
                        )}
                        {item.type === 'dropdown' && (!item.options || item.options.length < 2) && (
                          <Button
                            key={`${index}-${item.type}`}
                            intent="secondary"
                            variant="icon"
                            size="iconSm"
                            icon={item.icon}
                            onClick={() => {
                              item.onClick?.(item)
                              setPopoverOpen(false)
                            }}
                            disabled={item.disabled}
                          />
                        )}
                        {item.type === 'dropdown' && item.options && item.options.length > 1 && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                intent="secondary"
                                variant="icon"
                                size="iconSm"
                                icon={item.icon}
                                disabled={item.disabled}
                              />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="start"
                              className="w-[100px]"
                              onCloseAutoFocus={(e) => {
                                e.preventDefault()
                                editor?.commands.focus()
                              }}
                            >
                              {item.options?.map((option, index) => (
                                <DropdownMenuItem
                                  key={`${index}-${option.label}`}
                                  onClick={() => {
                                    item.onClick?.(option)
                                    setPopoverOpen(false)
                                  }}
                                >
                                  {option.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )} */}

          <EditorContent
            className="h-full"
            editor={editor}
            spellCheck={false}
            onKeyDown={handleEditorKeyDown}
          />
        </div>
      </>
    )
  }
)

export default TextEditor

const useHandleMarks = () => {
  return useCallback((editor: Editor, typeName: string) => {
    let marks: any[] = []
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'text' && node.marks.some((mark) => mark.type.name === typeName)) {
        const from = pos
        const to = pos + node.nodeSize
        const selectedText = editor.state.doc.textBetween(from, to, ' ')
        const bookmarkId = node.marks.find((mark) => mark.type.name === typeName)?.attrs?.id
        marks.push({
          id: bookmarkId,
          content: selectedText
        })
        return true
      }
      return true
    })

    return marks
  }, [])
}

const useDeleteMarks = () => {
  return useCallback((editor: Editor, marksIds: string[], typeName: string) => {
    if (!editor) return

    const transaction = editor.state.tr

    editor.state.doc.descendants((node, pos) => {
      const marks = node.marks.filter(
        (mark) => mark.type.name === typeName && marksIds.some((id) => id === mark.attrs.id)
      )

      if (marks.length > 0) {
        transaction.removeMark(pos, pos + node.nodeSize, editor.schema.marks[typeName])
      }
    })

    editor.view.dispatch(transaction)
  }, [])
}

const useGetSelectionMarks = () => {
  return useCallback((editor: Editor) => {
    const { from, to } = editor.state.selection

    if (from === to) {
      return editor.state.selection.$from.marks().map((mark) => ({
        type: mark.type.name,
        attrs: mark.attrs
      }))
    }

    const allMarks: { type: string; attrs: any }[] = []

    editor.state.doc.nodesBetween(from, to, (node, pos) => {
      if (!node.isText || node.marks.length === 0) {
        return true
      }

      const nodeFrom = Math.max(from, pos)
      const nodeTo = Math.min(to, pos + node.nodeSize)

      if (nodeFrom < nodeTo) {
        node.marks.forEach((mark) => {
          if (mark.attrs.id) {
            const exists = allMarks.some(
              (existingMark) =>
                existingMark.type === mark.type.name && existingMark.attrs.id === mark.attrs.id
            )
            if (!exists) {
              allMarks.push({
                type: mark.type.name,
                attrs: { ...mark.attrs }
              })
            }
          } else {
            const exists = allMarks.some(
              (existingMark) =>
                existingMark.type === mark.type.name &&
                JSON.stringify(existingMark.attrs) === JSON.stringify(mark.attrs)
            )
            if (!exists) {
              allMarks.push({
                type: mark.type.name,
                attrs: { ...mark.attrs }
              })
            }
          }
        })
      }

      return true
    })

    return allMarks
  }, [])
}

// Helper to convert text to Start Case
const toStartCase = (text: string): string => {
  if (!text) return ''
  // Split on sentence-ending punctuation (., ?, !), keeping the delimiter
  const segments = text.split(/([.?!])/)
  let result = ''
  for (let i = 0; i < segments.length; i += 2) {
    let segment = segments[i]
    if (segment.trim().length) {
      segment = segment.trimStart()
      const diff = segments[i].length - segment.length
      segment = segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase()
      // If the segment was trimmed, add spaces to match original length
      segment = (diff > 0 ? ' '.repeat(diff) : '') + segment
    }
    result += segment
    // Add the punctuation if it exists
    if (segments[i + 1]) {
      result += segments[i + 1]
    }
  }
  return result
}

// Helper to transform text according to caseType
const transformText = (caseType: string, text: string): string => {
  if (caseType === 'all-caps') {
    return text.toUpperCase()
  } else if (caseType === 'title-case') {
    return text.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
  } else if (caseType === 'start-case') {
    return toStartCase(text)
  } else {
    return text.toLowerCase()
  }
}
