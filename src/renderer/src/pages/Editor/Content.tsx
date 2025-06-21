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
import { useDispatch, useSelector } from 'react-redux'
import {
  selectApparatuses,
  selectBookmarkHighlighted,
  selectCommentHighlighted,
  selectTocSettings,
  selectToolbarEmphasisState,
  showTocChecked
} from './store/editor/editor.selector'
import {
  setCanAddBookmark,
  setCanRedo,
  setCanUndo,
  setHistory,
  updateTocSettings,
  setBookmark,
  setEmphasisState,
  setTocStructure,
  setHeadingEnabled,
  toggleBookmarkHighlighted,
  toggleCommentHighlighted,
  setComment,
  setCanAddComment,
  createApparatusesFromLayout
} from './store/editor/editor.slice'
import TextEditor, { EditorData } from '@/components/text-editor'
import HistoryEdu from '@/components/icons/HistoryEdu'
import Citation from '@/components/icons/Citation'
import Siglum from '@/components/icons/Siglum'
import CommentAdd from '@/components/icons/CommentAdd'
import Bookmark from '@/components/icons/Bookmark'
import LinkAdd from '@/components/icons/LinkAdd'
import {
  addComment,
  editCommentContent,
  selectComment,
  selectCommentWithId,
  setComments,
  setCommentsCategories,
  updateCommentList
} from './store/comment/comments.slice'
import { rendererLogger } from '@/utils/logger'
import {
  addBookmark,
  editBookmarkContent,
  selectBookmark,
  selectBookmarkWithId,
  setBookmarks,
  setBookmarksCategories,
  updateBookmarkList
} from './store/bookmark/bookmark.slice'
import {
  visibleBookmarksSelector,
  bookmarkCategoriesSelector
} from './store/bookmark/bookmark.selector'
import { useIpcRenderer } from '@/hooks/use-ipc-renderer'
import {
  selectFooterSettings,
  selectHeaderSettings,
  selectLineNumberSettings,
  selectPageNumberSettings
} from './store/pagination/pagination.selector'
import {
  updateFooterSettings,
  updateHeaderSettings,
  updateLineNumberSettings,
  updatePageNumberSettings
} from './store/pagination/pagination.slice'
import {
  bibliographyTemplate,
  introTemplate,
  textTemplate,
  tocTemplate
} from '@/lib/tiptap/templates-mock'
import {
  createTiptapJSONStructure,
  createTocTreeStructure,
  extractSectionsFromGlobalText
} from '@/lib/toc-tree-mapper'
import { useTranslation } from 'react-i18next'
import TextEditorNavBar from '@/components/text-editor-nav-bar'
import Check from '@/components/icons/Check'
import CustomSpacingModal from '@/pages/editor/dialogs/CustomSpacing'
import { PageSetupDialog } from './dialogs/PageSetupDialog/PageSetupDialog'
import ResumeNumberingModal from './dialogs/ResumeNumbering'
import SaveAsTemplateModal from './dialogs/SaveAsTemplateModal'
import { selectLayoutSettings } from './store/layout/layout.selector'
import { updateSetupPageState } from './store/layout/layout.sclice'
import SectionsStyleModal from './dialogs/SectionsStyleModal'
import { converterFromEditorToSetup, converterFromSetupToEditor } from '@/utils/optionsEnums'
import {
  commentCategoriesSelector,
  commentCategoryOptionsSelector,
  visibleCommentsSelector
} from './store/comment/comments.selector'
import { updateStyles } from './store/editor-styles/editor-styles.slice'
import { selectStyles } from './store/editor-styles/editor-styles.selector'
import { useSidebar } from '@/components/ui/sidebar'
import ChooseTemplateModal from './dialogs/ChooseTemplateModal'
import { useEditor } from './hooks/useEditor'
import { setCharacters, setEditorFocus, setSelectedSideviewTabIndex, setWords } from './provider'

interface ContentProps {
  onFocusEditor: () => void
  showToolbar: boolean
  onRegisterBookmark: (id: string, categoryId?: string) => void
  onRegisterComment: (id: string, categoryId?: string) => void
}

const EditorTextLayout = ({
  showToolbar,
  children
}: {
  showToolbar: boolean
  children: React.ReactNode
}) => {
  return (
    <div style={{ height: showToolbar ? 'calc(100vh - 4.5rem)' : 'calc(100vh - 2.25rem)' }}>
      <div className="h-full overflow-auto">
        <div className="flex flex-col h-full">{children}</div>
      </div>
    </div>
  )
}

export const Content = forwardRef(
  (
    { onFocusEditor, showToolbar, onRegisterBookmark, onRegisterComment }: ContentProps,
    ref: ForwardedRef<unknown>
  ) => {
    useImperativeHandle(ref, () => {
      return {
        focus: () => {
          editorRef?.current?.focus()
        },
        undo: (action?: HistoryAction) => {
          editorRef?.current?.undo(action)
        },
        redo: () => {
          editorRef?.current?.redo()
        },
        setHeadingLevel: async (headingLevel: number) => {
          const position = editorRef?.current?.setHeadingLevel(headingLevel)
          setTimeout(() => {
            editorRef?.current?.focus()
            if (position) {
              editorRef?.current?.setTextSelection(position)
            }
          }, 100)
        },
        setBody: (style) => {
          editorRef?.current?.setBody(style)
          setTimeout(() => {
            editorRef?.current?.focus()
          }, 100)
        },
        setFontFamily: (fontFamily: string) => {
          editorRef?.current?.setFontFamily(fontFamily)
        },
        setFontSize: (fontSize: string) => {
          editorRef?.current?.setFontSize(fontSize)
        },
        setBold: (bold: boolean) => {
          editorRef?.current?.setBold(bold)
        },
        setItalic: (italic: boolean) => {
          editorRef?.current?.setItalic(italic)
        },
        setUnderline: (underline: boolean) => {
          editorRef?.current?.setUnderline(underline)
        },
        setTextColor: (textColor: string) => {
          editorRef?.current?.setTextColor(textColor)
        },
        setHighlightColor: (highlightColor: string) => {
          editorRef?.current?.setHighlightColor(highlightColor)
        },
        setBlockquote: (blockquote: boolean) => {
          editorRef?.current?.setBlockquote(blockquote)
        },
        setTextAlignment: (alignment: string) => {
          editorRef?.current?.setTextAlignment(alignment)
        },
        setLineSpacing: (spacing: Spacing) => {
          editorRef?.current?.setLineSpacing(spacing)
        },
        setListStyle: (style: BulletStyle) => {
          editorRef?.current?.setListStyle(style)
        },
        setSuperscript: (superscript: boolean) => {
          editorRef?.current?.setSuperscript(superscript)
        },
        setSubscript: (subscript: boolean) => {
          editorRef?.current?.setSubscript(subscript)
        },
        increaseIndent: () => {
          editorRef?.current?.increaseIndent()
        },
        decreaseIndent: () => {
          editorRef?.current?.decreaseIndent()
        },
        showCustomSpacing: () => {
          setIsCustomSpacingOpen(true)
        },
        showResumeNumbering: () => {
          setIsResumeNumberingOpen(true)
        },
        continuePreviousNumbering: () => {
          editorRef?.current?.continuePreviousNumbering()
        },
        addBookmark: (categoryId?: string) => {
          bookmarkCategoryIdRef.current = categoryId
          registerBookmark()
        },
        unsetBookmark: () => {
          editorRef?.current?.unsetBookmark()
        },
        toggleNonPrintingCharacters: () => {
          editorRef?.current?.toggleNonPrintingCharacters()
        },
        scrollToBookmark: (id: string) => {
          criticalTextEditorRef?.current?.scrollToBookmark(id)
        },
        deleteBookmarks: (bookmarks: Bookmark[]) => {
          editorRef?.current?.deleteBookmarks(bookmarks)
        },
        addComment: (categoryId?: string) => {
          commentCategoryIdRef.current = categoryId
          registerComment()
        },
        unsetComment: () => {
          editorRef?.current?.unsetComment()
        },
        scrollToComment: (comment: AppComment) => {
          handleScrollToComment(comment)
        },
        deleteComments: (comments: AppComment[]) => {
          editorRef?.current?.deleteComments(comments)
        },
        scrollToHeadingIndex: (index: number) => {
          criticalTextEditorRef?.current?.scrollToHeadingIndex(index)
        },
        scrollToSection: (id?: string) => {
          criticalTextEditorRef?.current?.scrollToSection(id)
        },
        insertCharacter: (character: number) => {
          editorRef?.current?.insertCharacter(character)
        }
      }
    })

    const { t } = useTranslation()

    const [_, dispatchEditor] = useEditor()
    const dispatch = useDispatch()
    const emphasisState = useSelector(selectToolbarEmphasisState)

    const criticalTextEditorRef = useRef<any>()

    const [editorRef, setEditorRef] = useState<any>(null)
    const [isChooseTemplateModalOpen, setIsChooseTemplateModalOpen] = useState(false)
    const [saveTemplateModalOpen, setIsSaveAsTemplateModalOpen] = useState(false)
    const [isSectionsStyleModalOpen, setIsSectionsStyleModalOpen] = useState(false)

    const comments = useSelector(visibleCommentsSelector)
    const commentsCategories = useSelector(commentCategoriesSelector)
    const bookmarks = useSelector(visibleBookmarksSelector)
    const bookmarkCategories = useSelector(bookmarkCategoriesSelector)
    const tocSettings = useSelector(selectTocSettings)
    const lineNumberSettings = useSelector(selectLineNumberSettings)
    const pageNumberSettings = useSelector(selectPageNumberSettings)
    const headerSettings = useSelector(selectHeaderSettings)
    const footerSettings = useSelector(selectFooterSettings)
    const apparatusesList = useSelector(selectApparatuses)
    const showToc = useSelector(showTocChecked)

    const {
      setupDialogState: layoutTemplate,
      setupOption: pageSetup,
      sort
    } = useSelector(selectLayoutSettings)
    const styles = useSelector(selectStyles)

    const commentsRef = useRef(comments)
    const commentsCategoriesRef = useRef(commentsCategories)
    const bookmarksRef = useRef(bookmarks)
    const bookmarkCategoriesRef = useRef(bookmarkCategories)
    const tocSettingsRef = useRef(tocSettings)
    const lineNumberSettingsRef = useRef(lineNumberSettings)
    const pageNumberSettingsRef = useRef(pageNumberSettings)
    const headerSettingsRef = useRef(headerSettings)
    const footerSettingsRef = useRef(footerSettings)

    const bookmarkCategoryIdRef = useRef<string | undefined>(undefined)
    const commentCategoryIdRef = useRef<string | undefined>(undefined)

    const tocForTextRef = useRef<any>(null)
    const mainTextContentRef = useRef<any>(null)
    const introductionContentRef = useRef<any>(null)
    const bibliographyContentRef = useRef<any>(null)

    const registerComment = useCallback(() => {
      editorRef?.current?.addComment('MAIN_TEXT')
    }, [editorRef])

    const registerBookmark = useCallback(() => {
      criticalTextEditorRef?.current?.addBookmark()
    }, [])

    const handleScrollToComment = useCallback((comment: AppComment) => {
      switch (comment.target) {
        case 'MAIN_TEXT':
          criticalTextEditorRef?.current?.scrollToComment(comment.id)
          break
      }
    }, [])

    // @REFACTOR: some of this functions could be moved to a different file (ELayout.tsx)
    useIpcRenderer(
      (ipc) => {
        ipc.on('show-page-setup', () => {
          setIsPageSetupOpen(true)
        })

        ipc.on('CmdOrCtrl+Shift+K', () => {
          commentCategoryIdRef.current = undefined
          registerComment()
        })

        ipc.on('insert-comment', () => {
          commentCategoryIdRef.current = undefined
          registerComment()
        })

        ipc.on('insert-bookmark', () => {
          bookmarkCategoryIdRef.current = undefined
          registerBookmark()
        })

        // @ts-ignore
        ipc.on('change-character-style', (event, style) => {
          switch (style) {
            case 'bold':
              editorRef?.current?.setBold(!emphasisState.bold)
              break
            case 'italic':
              editorRef?.current?.setItalic(!emphasisState.italic)
              break
            case 'underline':
              editorRef?.current?.setUnderline(!emphasisState.underline)
              break
            case 'strikethrough':
              editorRef?.current?.setStrikeThrough(!emphasisState.strikethrough)
              break
            case 'superscript':
              editorRef?.current?.setSuperscript(!emphasisState.superscript)
              break
            case 'subscript':
              editorRef?.current?.setSubscript(!emphasisState.subscript)
              break
            case 'none-case':
            case 'all-caps':
            case 'small-caps':
            case 'title-case':
            case 'start-case':
              editorRef?.current?.setCase(style)
              break
            // Additional style cases could be added here
            default:
              console.warn(`Unhandled character style: ${style}`)
          }
        })

        ipc.on('CmdOrCtrl+,', () => {
          editorRef?.current.setSubscript(!emphasisState.subscript)
        })

        ipc.on('CmdOrCtrl+.', () => {
          editorRef?.current.setSuperscript(!emphasisState.superscript)
        })

        ipc.on('toggle-npc', () => {
          editorRef?.current?.toggleNonPrintingCharacters()
        })

        ipc.on('set-font-ligature', (_, ligature) => {
          if (!editorRef) return
          editorRef?.current?.setLigature(ligature)
        })

        // @ts-ignore
        ipc.on('change-indent-level', (event, action) => {
          if (!editorRef) return

          if (action === 'increase') {
            editorRef?.current?.increaseIndent()
          } else {
            editorRef?.current?.decreaseIndent()
          }
        })

        // @ts-ignore
        ipc.on('change-alignment', (event, alignment) => {
          if (!editorRef) return
          editorRef?.current?.setTextAlignment(alignment)
        })

        // Character spacing listeners with their shortcut listener
        // @ts-ignore
        ipc.on('change-character-spacing', (event, spacing) => {
          if (!editorRef) return

          if (spacing === 'normal') {
            editorRef?.current?.unsetCharacterSpacing()
          } else if (spacing === 'increase') {
            editorRef?.current?.increaseCharacterSpacing()
          } else {
            editorRef?.current?.decreaseCharacterSpacing()
          }
        })

        ipc.on('CmdOrCtrl+Alt+-', () => {
          if (!editorRef) return

          editorRef?.current?.decreaseCharacterSpacing()
        })

        ipc.on('CmdOrCtrl+Alt+_', () => {
          if (!editorRef) return

          editorRef?.current?.increaseCharacterSpacing()
        })

        // Listener for Line spacing
        // @ts-ignore
        ipc.on('set-line-spacing', (event, lineSpacing) => {
          if (!editorRef) return

          const spacing = {
            line: lineSpacing,
            before: null,
            after: null
          }

          editorRef?.current?.setLineSpacing(spacing)
        })

        ipc.on('show-spacing-settings', () => {
          setIsCustomSpacingOpen(true)
        })

        // Listener for list style
        ipc.on('change-list-style', (_, listStyle) => {
          if (!editorRef) return

          const bulletStyle: BulletStyle = {
            ...listStyle,
            previousType: emphasisState.bulletStyle?.type
          }

          editorRef?.current?.setListStyle(bulletStyle)
        })

        ipc.on('number-bullet', () => {
          if (!editorRef) return

          const bulletStyle: BulletStyle = {
            type: 'ORDER',
            style: 'decimal',
            previousType: emphasisState.bulletStyle?.type
          }
          editorRef?.current?.setListStyle(bulletStyle)
        })

        ipc.on('upper-letter-bullet', () => {
          if (!editorRef) return

          const bulletStyle: BulletStyle = {
            type: 'ORDER',
            style: 'upper-alpha',
            previousType: emphasisState.bulletStyle?.type
          }
          editorRef?.current?.setListStyle(bulletStyle)
        })

        ipc.on('low-letter-bullet', () => {
          if (!editorRef) return

          const bulletStyle: BulletStyle = {
            type: 'ORDER',
            style: 'lower-alpha',
            previousType: emphasisState.bulletStyle?.type
          }
          editorRef?.current?.setListStyle(bulletStyle)
        })

        ipc.on('point-bullet', () => {
          if (!editorRef) return

          const bulletStyle: BulletStyle = {
            type: 'BULLET',
            style: 'disc',
            previousType: emphasisState.bulletStyle?.type
          }

          editorRef?.current?.setListStyle(bulletStyle)
        })

        ipc.on('circle-bullet', () => {
          if (!editorRef) return

          const bulletStyle: BulletStyle = {
            type: 'BULLET',
            style: 'circle',
            previousType: emphasisState.bulletStyle?.type
          }

          editorRef?.current?.setListStyle(bulletStyle)
        })

        ipc.on('square-bullet', () => {
          if (!editorRef) return

          const bulletStyle: BulletStyle = {
            type: 'BULLET',
            style: 'square',
            previousType: emphasisState.bulletStyle?.type
          }

          editorRef?.current?.setListStyle(bulletStyle)
        })

        ipc.on('previous-numbering', () => {
          if (!editorRef) return

          editorRef?.current?.continuePreviousNumbering()
        })

        ipc.on('resume-numbering', () => {
          if (!editorRef) return

          setIsResumeNumberingOpen(true)
        })

        ipc.on('receive-open-choose-layout-modal', () => {
          setIsChooseTemplateModalOpen(true)
        })

        ipc.on('save-as-template', () => {
          setIsSaveAsTemplateModalOpen(true)
        })

        ipc.on('show-sections-style-modal', () => {
          setIsSectionsStyleModalOpen(true)
        })

        ipc.on('show-sections-style-modal', () => {
          setIsSectionsStyleModalOpen(true)
        })

        return () => {
          ipc.cleanup()
        }
      },
      [window?.electron?.ipcRenderer, editorRef, emphasisState]
    )

    useEffect(() => {
      const taskId = rendererLogger.startTask('TextEditor', 'DocOpening initialized')

      // @REFACTOR: this is a heavy function, we should refactor it
      window?.electron?.ipcRenderer?.on('load-document', (_event, document: any) => {
        const criticalText = document.main_text
        const annotations = document.annotations
        const comments = annotations?.comments
        const commentCategories = annotations?.commentCategories
        const bookmarks = annotations?.bookmarks
        const bookmarkCategories = annotations?.bookmarkCategories
        const currentTemplate = document.template

        criticalTextEditorRef.current.setJSON(criticalText)

        commentsRef.current = comments
        commentsCategoriesRef.current = commentCategories
        bookmarksRef.current = bookmarks
        bookmarkCategoriesRef.current = bookmarkCategories

        const tocSettings = currentTemplate?.paratextual?.tocSettings
        const lineNumberSettings = currentTemplate?.paratextual?.lineNumberSettings
        const pageNumberSettings = currentTemplate?.paratextual?.pageNumberSettings
        const headerSettings = currentTemplate?.paratextual?.headerSettings
        const footerSettings = currentTemplate?.paratextual?.footerSettings
        const templateStyles = currentTemplate?.styles || []

        tocSettingsRef.current = tocSettings
        lineNumberSettingsRef.current = lineNumberSettings
        pageNumberSettingsRef.current = pageNumberSettings
        headerSettingsRef.current = headerSettings
        footerSettingsRef.current = footerSettings

        dispatch(
          updateSetupPageState({
            setupDialogState: currentTemplate?.layoutTemplate,
            sort: currentTemplate?.sort,
            setupOption: currentTemplate?.pageSetup
          })
        )

        dispatch(setComments(comments))
        dispatch(setCommentsCategories(commentCategories))
        dispatch(setBookmarks(bookmarks))
        dispatch(setBookmarksCategories(bookmarkCategories))

        dispatch(updateTocSettings(tocSettings))
        dispatch(updateLineNumberSettings(lineNumberSettings))
        dispatch(updatePageNumberSettings(pageNumberSettings))
        dispatch(updateHeaderSettings(headerSettings))
        dispatch(updateFooterSettings(footerSettings))

        // Update editor styles only if the template defines at least one style.
        if (templateStyles.length > 0) {
          dispatch(updateStyles(templateStyles))
        }
      })

      rendererLogger.endTask(taskId, 'TextEditor', 'DocOpening action completed')
    }, [window?.electron?.ipcRenderer])

    // @REFACTOR: use a better way to do this, or split this function in smaller ones
    const updateHandler = useCallback(() => {
      const taskId = rendererLogger.startTask('TextEditor', 'Content update')

      const textEditorJson = criticalTextEditorRef.current?.getJSON()

      window?.electron?.ipcRenderer?.send('update-critical-text', textEditorJson)

      window?.electron?.ipcRenderer?.send('update-annotations', {
        comments: commentsRef.current || [],
        commentCategories: commentsCategoriesRef.current,
        bookmarks: bookmarksRef.current,
        bookmarkCategories: bookmarkCategoriesRef.current
      })

      window?.doc?.setLayoutTemplate(layoutTemplate)
      window?.doc?.setPageSetup(pageSetup)
      window?.doc?.setSort(sort)
      window?.doc?.setStyles(styles)

      window?.doc?.setParatextual({
        tocSettings: tocSettingsRef.current,
        lineNumberSettings: lineNumberSettingsRef.current,
        pageNumberSettings: pageNumberSettingsRef.current,
        headerSettings: headerSettingsRef.current,
        footerSettings: footerSettingsRef.current
      })

      rendererLogger.endTask(taskId, 'TextEditor', 'Editor content updated')
    }, [
      styles,
      layoutTemplate,
      pageSetup,
      sort,
      criticalTextEditorRef,
      commentsRef,
      commentsCategoriesRef,
      bookmarksRef,
      bookmarkCategoriesRef,
      tocSettingsRef,
      lineNumberSettingsRef,
      pageNumberSettingsRef,
      headerSettingsRef,
      footerSettingsRef
    ])

    useEffect(() => {
      const updateContentRefs = () => {
        const textEditorJson = criticalTextEditorRef.current?.getJSON()

        const introductionData = extractSectionsFromGlobalText(textEditorJson, 'introduction')

        const extractedMainTextSections = extractSectionsFromGlobalText(textEditorJson, 'maintext')
        const bibliographyData = extractSectionsFromGlobalText(textEditorJson, 'bibliography')

        const tocStructureData = createTocTreeStructure(
          {
            type: 'doc',
            content: extractedMainTextSections
          },
          tocSettings
        )

        const tocForText = createTiptapJSONStructure(
          tocStructureData,
          tocSettings,
          window.innerWidth / 2.3
        )

        // Store the Table of Contents (TOC) structure in a ref to ensure it can be accessed and updated without triggering unnecessary re-renders.
        tocForTextRef.current = tocForText
        introductionContentRef.current = introductionData
        mainTextContentRef.current = extractedMainTextSections
        bibliographyContentRef.current = bibliographyData

        setTimeout(() => {
          dispatch(setTocStructure(tocStructureData))
        }, 100)
      }

      updateContentRefs()
    }, [tocSettings])

    useEffect(() => {
      commentsRef.current = comments
      commentsCategoriesRef.current = commentsCategories
      bookmarksRef.current = bookmarks
      bookmarkCategoriesRef.current = bookmarkCategories
      tocSettingsRef.current = tocSettings
      lineNumberSettingsRef.current = lineNumberSettings
      pageNumberSettingsRef.current = pageNumberSettings
      headerSettingsRef.current = headerSettings
      footerSettingsRef.current = footerSettings
      updateHandler()
    }, [
      comments,
      commentsCategories,
      bookmarks,
      bookmarkCategories,
      tocSettings,
      lineNumberSettings,
      pageNumberSettings,
      headerSettings,
      footerSettings
    ])

    // @REFACTOR: this is a heavy function, we should refactor it
    const updateTemplates = useCallback(
      async (showToc: boolean = true) => {
        let data: unknown[] = []
        sort.forEach((item) => {
          if (layoutTemplate[item].visible) {
            switch (item) {
              case 'toc':
                if (showToc) {
                  data.push(
                    ...tocTemplate(t('dividerSections.toc'), tocForTextRef.current?.content)
                  )
                }
                break
              case 'intro':
                data.push(
                  ...introTemplate(
                    t('dividerSections.introduction'),
                    introductionContentRef.current
                  )
                )
                break
              case 'bibliography':
                data.push(
                  ...bibliographyTemplate(
                    t('dividerSections.bibliography'),
                    bibliographyContentRef.current
                  )
                )
                break
              case 'critical':
                data.push(
                  ...textTemplate(t('dividerSections.mainText'), mainTextContentRef.current)
                )
                break
            }
          }
        })

        const content = {
          type: 'doc',
          content: data
        }

        // @REFACTOR: check again this solution, this could generate future issues
        try {
          await criticalTextEditorRef.current.setJSON(content)
          setTimeout(() => {
            criticalTextEditorRef.current.scrollToSection('toc')
          }, 1000)
        } catch (error) {
          console.error('Error updating templates:', error)
        }
      },
      [
        sort,
        layoutTemplate,
        tocSettings,
        tocForTextRef,
        introductionContentRef,
        mainTextContentRef,
        bibliographyContentRef
      ]
    )

    const toolbarBookmarkCategories: BubbleToolbarItemOption[] = [
      {
        label: 'Uncategorised',
        value: null
      },
      ...useSelector(bookmarkCategoriesSelector).map((category) => ({
        label: category.name,
        value: category.id
      }))
    ]

    const commentCategoryOptions = useSelector(commentCategoryOptionsSelector)

    const [isPageSetupOpen, setIsPageSetupOpen] = useState(false)
    const [isCustomSpacingOpen, setIsCustomSpacingOpen] = useState(false)
    const [isResumeNumberingOpen, setIsResumeNumberingOpen] = useState(false)

    const memoizedTocSettings = useMemo(() => tocSettings, [tocSettings])

    // @REFACTOR: use "useCallback" for this function and generally always use it
    const extractEditorSections = (textEditorJson: any) => {
      const mainTextData = extractSectionsFromGlobalText(textEditorJson, 'maintext')
      const introductionData = extractSectionsFromGlobalText(textEditorJson, 'introduction')
      const bibliographyData = extractSectionsFromGlobalText(textEditorJson, 'bibliography')
      return { mainTextData, introductionData, bibliographyData }
    }

    const generateTocForText = (tocStructureData: any) => {
      return createTiptapJSONStructure(
        tocStructureData,
        memoizedTocSettings,
        window.innerWidth / 2.3
      )
    }

    const updateHandlerEffect = useCallback(() => {
      updateHandler()

      const textEditorJson = criticalTextEditorRef.current?.getJSON()
      const { mainTextData, introductionData, bibliographyData } =
        extractEditorSections(textEditorJson)

      const mainTextContent = {
        type: 'doc',
        content: mainTextData
      }

      const tocStructureData = createTocTreeStructure(mainTextContent, memoizedTocSettings)
      dispatch(setTocStructure(tocStructureData))

      const tocForText = generateTocForText(tocStructureData)

      tocForTextRef.current = tocForText
      introductionContentRef.current = introductionData
      mainTextContentRef.current = mainTextData
      bibliographyContentRef.current = bibliographyData
    }, [criticalTextEditorRef, memoizedTocSettings, updateHandler])

    // @REFACTOR: use "useCallback" for this function and generally always use it
    const handleSaveTemplate = (templateName) => {
      const paratextual = {
        tocSettings: tocSettingsRef.current,
        lineNumberSettings: lineNumberSettingsRef.current,
        pageNumberSettings: pageNumberSettingsRef.current,
        headerSettings: headerSettingsRef.current,
        footerSettings: footerSettingsRef.current
      }

      const newLayoutTemplate = {
        ...layoutTemplate,
        critical: {
          visible: layoutTemplate.critical.visible || true,
          layout: layoutTemplate.critical.layout || 'vertical-horizontal',
          apparatusDetails: [
            {
              id: 'element1',
              title: 'Text',
              sectionType: 'text',
              type: 'text',
              columns:
                layoutTemplate.critical.apparatusDetails.find(({ type }) => type === 'text')
                  ?.columns ?? 1,
              disabled: true,
              visible: true
            },
            ...apparatusesList.map((app) => ({
              ...app,
              id: app.id,
              type: 'apparatus',
              sectionType: converterFromEditorToSetup(app.type),
              columns:
                layoutTemplate.critical.apparatusDetails.find(({ id }) => id === app.id)?.columns ??
                1,
              visible:
                layoutTemplate.critical.apparatusDetails.find(({ id }) => id === app.id)?.visible ??
                app.visible,
              disabled:
                layoutTemplate.critical.apparatusDetails.find(({ id }) => id === app.id)
                  ?.disabled || false //app.disabled || false,
            }))
          ],
          required: layoutTemplate.critical.required || false
        }
      }

      const styleTemplate = {
        layoutTemplate: newLayoutTemplate,
        pageSetup,
        sort,
        styles,
        paratextual
      }

      async function createTemplate() {
        await window.doc?.createTemplate(styleTemplate, templateName)
        setIsSaveAsTemplateModalOpen(false)
      }
      createTemplate()
    }

    // @REFACTOR: use "useCallback" for this function and generally always use it
    const handleEditorViewContent = (data: any) => {
      const orderSection = data?.sort
      const layoutTemplate = data?.layoutTemplate
      let tocEnabled = false
      const layoutTemplateNewOrder = orderSection?.map((sectionName: string) => ({
        [sectionName]: layoutTemplate[sectionName]
      }))

      const _content = layoutTemplateNewOrder?.flatMap((sectionObj) => {
        const key = Object.keys(sectionObj)[0]
        const sectionData = sectionObj[key]

        if (!sectionData?.visible) return []
        const sectionContentParagraph = (cont, sectionType) =>
          cont.length === 0
            ? [
                {
                  type: 'paragraph',
                  attrs: {
                    level: 2,
                    sectionType: sectionType,
                    indent: 0,
                    textAlign: 'left',
                    lineHeight: 1,
                    marginTop: 10,
                    marginBottom: 10
                  }
                }
              ]
            : [...cont]

        switch (key) {
          case 'toc':
            tocEnabled = sectionData?.visible
            return tocSettingsRef.current?.show
              ? tocTemplate(
                  t('dividerSections.toc'),
                  sectionContentParagraph(tocForTextRef.current?.content, 'toc')
                )
              : []
          case 'intro':
            return introTemplate(
              t('dividerSections.introduction'),
              sectionContentParagraph(introductionContentRef.current, 'intro')
            )
          case 'bibliography':
            return bibliographyTemplate(
              t('dividerSections.bibliography'),
              sectionContentParagraph(bibliographyContentRef.current, 'bibliography')
            )

          case 'critical':
            return textTemplate(t('dividerSections.mainText'), mainTextContentRef.current)

          default:
            return textTemplate(t('dividerSections.mainText'), mainTextContentRef.current)
        }
      })

      const tocSettings = data?.paratextual?.tocSettings
      const lineNumberSettings = data?.paratextual?.lineNumberSettings
      const pageNumberSettings = data?.paratextual?.pageNumberSettings
      const headerSettings = data?.paratextual?.headerSettings
      const footerSettings = data?.paratextual?.footerSettings
      const templateStyles = data?.styles

      tocSettingsRef.current = tocSettings
      lineNumberSettingsRef.current = lineNumberSettings
      pageNumberSettingsRef.current = pageNumberSettings
      headerSettingsRef.current = headerSettings
      footerSettingsRef.current = footerSettings

      dispatch(updateTocSettings(tocSettings))
      dispatch(updateLineNumberSettings(lineNumberSettings))
      dispatch(updatePageNumberSettings(pageNumberSettings))
      dispatch(updateHeaderSettings(headerSettings))
      dispatch(updateFooterSettings(footerSettings))

      // Apply editor styles only if the template defines at least one style.
      if (templateStyles?.length > 0) {
        dispatch(updateStyles(templateStyles))
      }

      window?.doc?.setLayoutTemplate(layoutTemplate)
      window?.doc?.setPageSetup(data?.pageSetup)
      window?.doc?.setSort(orderSection as unknown[])

      // Apply editor styles only if the template defines at least one style.
      if (templateStyles?.length > 0) {
        window?.doc?.setStyles(templateStyles)
      } else {
        // Otherwise, use the editor’s default styles.
        window?.doc?.setStyles(styles)
      }

      window?.doc?.setParatextual(data?.paratextual)

      window?.menu?.setTocMenuItemsEnabled(tocEnabled)

      criticalTextEditorRef.current?.setJSON({
        type: 'doc',
        content: _content
      })
    }

    const sidebar = useSidebar()

    // @REFACTOR: try to find a better way to do this
    useEffect(() => {
      // Update the table of contents when the showToc state changes
      updateTemplates(showToc)
    }, [showToc])

    return (
      <>
        <EditorTextLayout showToolbar={showToolbar}>
          <TextEditorNavBar
            title="Text"
            options={[
              {
                type: 'ITEM',
                title: 'Update Table of Contents',
                onClick: () => updateTemplates(),
                enabled: showToc
              },
              {
                type: 'ITEM',
                title: 'Import',
                onClick: () => {}
              },
              {
                type: 'ITEM',
                title: 'Paste',
                onClick: () => {}
              },
              {
                type: 'ITEM',
                title: 'Paste with notes',
                onClick: () => {}
              },
              {
                type: 'SEPARATOR'
              },
              {
                type: 'ITEM',
                title: 'Show Note highlights',
                icon: <Check className="w-4 h-4" />,
                onClick: () => {}
              },
              {
                type: 'ITEM',
                title: 'Show Comment highlights',
                icon: useSelector(selectCommentHighlighted) ? <Check className="w-4 h-4" /> : null,
                onClick: () => {
                  dispatch(toggleCommentHighlighted())
                }
              },
              {
                type: 'ITEM',
                title: 'Show Bookmark highlights',
                icon: useSelector(selectBookmarkHighlighted) ? <Check className="w-4 h-4" /> : null,
                onClick: () => {
                  dispatch(toggleBookmarkHighlighted())
                }
              }
            ]}
            className="sticky top-0 z-10"
          />
          <TextEditor
            className="flex-1 overflow-auto relative w-full"
            isMainText={true}
            ref={criticalTextEditorRef}
            onUpdate={(editor: EditorData) => {
              dispatchEditor(setCharacters(editor.characters))
              dispatchEditor(setWords(editor.words))
              updateHandlerEffect()
            }}
            onFocusEditor={() => {
              setEditorRef(criticalTextEditorRef)
              dispatch(setCanAddBookmark(true))
              dispatch(setCanAddComment(true))
              dispatchEditor(setEditorFocus(true))
              onFocusEditor()
            }}
            bookmarkHighlighted={useSelector(selectBookmarkHighlighted)}
            onChangeBookmarks={(bookmarks) => {
              dispatch(updateBookmarkList(bookmarks))
            }}
            onChangeComments={(comments) => {
              dispatch(updateCommentList({ target: 'MAIN_TEXT', comments: comments }))
            }}
            onChangeBookmark={(data) => {
              dispatch(editBookmarkContent({ bookmarkId: data.id, content: data.content }))
            }}
            commentHighlighted={useSelector(selectCommentHighlighted)}
            onChangeComment={(data) => {
              dispatch(editCommentContent({ commentId: data.id, content: data.content }))
            }}
            onSelectionMarks={(selectionMarks) => {
              const commentMarksIds = selectionMarks
                .filter((mark) => mark.type === 'comment')
                ?.map((mark) => mark?.attrs?.id)
              const bookmarkMarksIds = selectionMarks
                .filter((mark) => mark.type === 'bookmark')
                ?.map((mark) => mark?.attrs?.id)

              if (commentMarksIds.length > 0) {
                dispatch(selectCommentWithId(commentMarksIds[0]))
                sidebar.setOpen(true)
                dispatchEditor(setSelectedSideviewTabIndex(0))
              } else if (bookmarkMarksIds.length > 0) {
                dispatch(selectBookmarkWithId(bookmarkMarksIds[0]))
                sidebar.setOpen(true)
                dispatchEditor(setSelectedSideviewTabIndex(1))
              } else {
                dispatch(selectComment(null))
                dispatch(selectBookmark(null))
              }
            }}
            onBookmarkStateChange={(active) => {
              dispatch(setBookmark(active))
            }}
            onCommentStateChange={(active) => {
              dispatch(setComment(active))
            }}
            onBookmarkCreated={async (id, content) => {
              const userInfo = (await window?.system?.getUserInfo()) as unknown as UserInfo
              dispatch(
                addBookmark({
                  id: id,
                  baseTitle: 'Bookmark',
                  content: content ?? '',
                  categoryId: bookmarkCategoryIdRef.current,
                  userInfo: userInfo.username
                })
              )
              sidebar.setOpen(true)
              dispatchEditor(setSelectedSideviewTabIndex(1))
              setTimeout(() => {
                onRegisterBookmark(id, bookmarkCategoryIdRef.current)
              }, 100)
            }}
            onCommentCreated={async (id, content) => {
              const userInfo = (await window?.system?.getUserInfo()) as unknown as UserInfo
              dispatch(
                addComment({
                  id: id,
                  content: content ?? '',
                  target: 'MAIN_TEXT',
                  categoryId: commentCategoryIdRef.current,
                  userInfo: userInfo.username
                })
              )
              sidebar.setOpen(true)
              dispatchEditor(setSelectedSideviewTabIndex(0))
              setTimeout(() => {
                onRegisterComment(id, commentCategoryIdRef.current)
              }, 100)
            }}
            onEmphasisStateChange={(emphasisState) => {
              dispatch(setEmphasisState(emphasisState))
            }}
            onHistoryStateChange={(historyState) => {
              dispatch(setHistory(historyState))
            }}
            onCanUndo={(value) => {
              dispatch(setCanUndo(value))
            }}
            onCanRedo={(value) => {
              dispatch(setCanRedo(value))
            }}
            onCurrentSection={(section) => {
              dispatch(setHeadingEnabled(section !== 'toc'))
            }}
            bubbleToolbarItems={[
              {
                icon: <HistoryEdu intent="primary" variant="tonal" size="small" />,
                type: 'button'
              },
              {
                icon: <Siglum intent="primary" variant="tonal" size="small" />,
                type: 'button'
              },
              {
                icon: <Citation intent="primary" variant="tonal" size="small" />,
                type: 'button'
              },
              {
                icon: <CommentAdd intent="primary" variant="tonal" size="small" />,
                type: 'dropdown',
                options: [
                  {
                    label: 'Uncategorised',
                    value: null
                  },
                  ...commentCategoryOptions
                ],
                onClick: (data?: any) => {
                  const categoryId = data?.value
                  commentCategoryIdRef.current = categoryId
                  registerComment()
                }
              },
              {
                icon: <Bookmark intent="primary" variant="tonal" size="small" />,
                type: 'dropdown',
                options: toolbarBookmarkCategories,
                onClick: (data?: any) => {
                  const categoryId = data?.value
                  bookmarkCategoryIdRef.current = categoryId
                  registerBookmark()
                }
              },
              {
                icon: <LinkAdd intent="primary" variant="tonal" size="small" />,
                type: 'button'
              }
            ]}
          />
        </EditorTextLayout>

        {isPageSetupOpen && (
          <PageSetupDialog
            open={isPageSetupOpen}
            onClose={(data: PageSetupInterface | undefined) => {
              handleEditorViewContent(data)
              setIsPageSetupOpen(false)
            }}
            onSave={(data: any) => {
              dispatch(createApparatusesFromLayout(data))
            }}
            apparatusesList={apparatusesList}
          />
        )}

        <CustomSpacingModal
          isOpen={isCustomSpacingOpen}
          onCancel={() => setIsCustomSpacingOpen(false)}
          onApply={(spacing: Spacing) => {
            editorRef?.current?.setLineSpacing(spacing)
            setIsCustomSpacingOpen(false)
          }}
        />
        <ResumeNumberingModal
          isOpen={isResumeNumberingOpen}
          onCancel={() => setIsResumeNumberingOpen(false)}
          onApply={(numberBullet: number) => {
            editorRef?.current?.setListNumbering(numberBullet)
            setIsResumeNumberingOpen(false)
          }}
        />
        {isChooseTemplateModalOpen && (
          <ChooseTemplateModal
            open={isChooseTemplateModalOpen}
            onClose={() => setIsChooseTemplateModalOpen(false)}
            onContinue={(selectedTemplate) => {
              dispatch(
                updateSetupPageState({
                  setupDialogState: selectedTemplate.layoutTemplate,
                  sort: selectedTemplate.sort,
                  setupOption: selectedTemplate.pageSetup
                })
              )

              const apparatusList =
                selectedTemplate.layoutTemplate.critical.apparatusDetails.filter(
                  (app) => app.type !== 'text'
                )
              const apparatusEditorList = apparatusList.map((el) => ({
                id: el.id,
                title: el.title,
                type: converterFromSetupToEditor(el.sectionType),
                visible: el.visible,
                disabled: el.disabled
              }))
              dispatch(createApparatusesFromLayout(apparatusEditorList))
              setIsChooseTemplateModalOpen(false)
              selectedTemplate.name?.toLowerCase() === 'blank'
                ? setIsPageSetupOpen(true)
                : handleEditorViewContent(selectedTemplate)
            }}
          ></ChooseTemplateModal>
        )}
        {saveTemplateModalOpen && (
          <SaveAsTemplateModal
            open={saveTemplateModalOpen}
            onClose={() => setIsSaveAsTemplateModalOpen(false)}
            onSaveTemplate={handleSaveTemplate}
          ></SaveAsTemplateModal>
        )}
        {isSectionsStyleModalOpen && (
          <SectionsStyleModal
            open={isSectionsStyleModalOpen}
            onClose={() => setIsSectionsStyleModalOpen(false)}
          ></SectionsStyleModal>
        )}
      </>
    )
  }
)
