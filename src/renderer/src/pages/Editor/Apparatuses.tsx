import PlusSimple from '@/components/icons/PlusSimple'
import UnfoldMore from '@/components/icons/UnfoldMore'
import { AnimatePresence, motion, MotionGlobalConfig } from 'framer-motion'
import { cn } from '@/lib/utils'
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
import DragIndicator from '@/components/icons/DragIndicator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import More from '@/components/icons/More'
import Check from '@/components/icons/Check'
import { useDispatch, useSelector } from 'react-redux'
import {
  selectApparatuses,
  selectApparatusesTypes,
  selectDisabledRemainingApparatusesTypes,
  selectEnabledRemainingApparatusesTypes,
  selectVisibleApparatuses
} from './store/editor/editor.selector'
import {
  addApparatusAfterIndex,
  changeApparatusTitle,
  changeApparatusType,
  createApparatusesFromDocument,
  removeApparatus,
  setCanAddBookmark,
  setCanRedo,
  setCanUndo,
  setEmphasisState,
  toggleVisibilityApparatus,
  updateVisibleApparatuses
} from './store/editor/editor.slice'
import TextEditor, { EditorData, HTMLTextEditorElement } from '@/components/text-editor'
import { Input } from '@/components/ui/input'
import { rendererLogger } from '@/utils/logger'
import { useIpcRenderer } from '@/hooks/use-ipc-renderer'
import useSingleAndDoubleClick from '@/hooks/use-single-double-click'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import Button from '@/components/ui/button'
import { useTranslation } from 'react-i18next'
import {
  addComment,
  editCommentContent,
  selectComment,
  selectCommentWithId,
  updateCommentList
} from './store/comment/comments.slice'
import ReorderGroup from '@/components/reorder-group'
import ReorderItem from '@/components/reorder-item'
import { useSidebar } from '@/components/ui/sidebar'
import HistoryEdu from '@/components/icons/HistoryEdu'
import Siglum from '@/components/icons/Siglum'
import Citation from '@/components/icons/Citation'
import CommentAdd from '@/components/icons/CommentAdd'
import { commentCategoryOptionsSelector } from './store/comment/comments.selector'
import { setSelectedSideviewTabIndex } from './provider'
import { useEditor } from './hooks/useEditor'

const types = [
  'CRITICAL',
  'PAGE_NOTES',
  'SECTION_NOTES',
  'INNER_MARGIN',
  'OUTER_MARGIN'
] as const satisfies ApparatusType[]

interface EditorApparatusProps {
  onFocusEditor: () => void
  onRegisterComment: (id: string, categoryId?: string) => void
}

const Apparatuses = forwardRef(
  ({ onFocusEditor, onRegisterComment }: EditorApparatusProps, ref: ForwardedRef<unknown>) => {
    MotionGlobalConfig.skipAnimations = true

    const [, dispatchEditor] = useEditor()

    const { t } = useTranslation()

    const apparatusRef = useRef<Apparatus | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const commentCategoryIdRef = useRef<string | undefined>(undefined)
    const editorRefs = useRef<{ [key: string]: HTMLTextEditorElement }>({})
    const [editorRef, setEditorRef] = useState<HTMLTextEditorElement>()
    const sidebar = useSidebar()

    useImperativeHandle(ref, () => {
      return {
        focus: () => {
          editorRef?.focus()
        },
        undo: (action?: HistoryAction) => {
          editorRef?.undo(action)
        },
        redo: () => {
          editorRef?.redo()
        },
        setHeadingLevel: (headingLevel: number) => {
          editorRef?.setHeadingLevel(headingLevel)
        },
        setBody: () => {
          editorRef?.setBody()
        },
        setFontFamily: (fontFamily: string) => {
          editorRef?.setFontFamily(fontFamily)
        },
        setFontSize: (fontSize: string) => {
          editorRef?.setFontSize(fontSize)
        },
        setBold: (bold: boolean) => {
          editorRef?.setBold(bold)
        },
        setItalic: (italic: boolean) => {
          editorRef?.setItalic(italic)
        },
        setUnderline: (underline: boolean) => {
          editorRef?.setUnderline(underline)
        },
        setTextColor: (textColor: string) => {
          editorRef?.setTextColor(textColor)
        },
        setHighlightColor: (highlightColor: string) => {
          editorRef?.setHighlightColor(highlightColor)
        },
        setBlockquote: (blockquote: boolean) => {
          editorRef?.setBlockquote(blockquote)
        },
        setTextAlignment: (alignment: string) => {
          editorRef?.setTextAlignment(alignment)
        },
        setLineSpacing: (spacing: Spacing) => {
          editorRef?.setLineSpacing(spacing)
        },
        setListStyle: (style: BulletStyle) => {
          editorRef?.setListStyle(style)
        },
        setSuperscript: (superscript: boolean) => {
          editorRef?.setSuperscript(superscript)
        },
        setSubscript: (subscript: boolean) => {
          editorRef?.setSubscript(subscript)
        },
        increaseIndent: () => {
          editorRef?.increaseIndent()
        },
        decreaseIndent: () => {
          editorRef?.decreaseIndent()
        },
        showCustomSpacing: () => {
          // setIsCustomSpacingOpen(true);
        },
        showResumeNumbering: () => {
          // setIsResumeNumberingOpen(true);
        },
        continuePreviousNumbering: () => {
          editorRef?.continuePreviousNumbering()
        },
        toggleNonPrintingCharacters: () => {
          editorRef?.toggleNonPrintingCharacters()
        },
        addComment: () => {
          editorRef?.addComment()
        },
        unsetComment: () => {
          editorRef?.unsetComment()
        },
        // @ts-ignore
        scrollToComment: (comment: AppComment) => {
          // handleScrollToComment(comment);
        },
        deleteComments: (comments: AppComment[]) => {
          editorRef?.deleteComments(comments)
        },
        insertCharacter: (character: number) => {
          editorRef?.insertCharacter(character)
        }
      }
    })

    const dispatch = useDispatch()

    const apparatuses = useSelector(selectApparatuses)
    const visibleApparatuses = useSelector(selectVisibleApparatuses)
    const apparatusesTypes = useSelector(selectApparatusesTypes)

    const hasOneCriticalApparatus = useMemo(() => {
      const criticalApparatuses = apparatuses.filter((apparatus) => apparatus.type === 'CRITICAL')
      return criticalApparatuses.length === 1
    }, [apparatuses])

    const enabledRemainingApparatusesTypes = useSelector(selectEnabledRemainingApparatusesTypes)
    const disabledRemainingApparatusesTypes = useSelector(selectDisabledRemainingApparatusesTypes)
    const [expandedApparatuses, setExpandedApparatuses] = useState<Apparatus[]>([])
    const [editingApparatus, setEditingApparatus] = useState<Apparatus | null>(null)
    const [apparatusesData, setApparatusesData] = useState<any[]>([])

    const [draggingDirection, setDraggingDirection] = useState<'y' | boolean>(false)
    const commentCategoryOptions = useSelector(commentCategoryOptionsSelector)

    const apparatusTypeName = (type: ApparatusType) => {
      switch (type) {
        case 'CRITICAL':
          return 'Critical'
        case 'PAGE_NOTES':
          return 'Page Notes'
        case 'SECTION_NOTES':
          return 'Section Notes'
        case 'INNER_MARGIN':
          return 'Inner Margin'
        case 'OUTER_MARGIN':
          return 'Outer Margin'
      }
    }

    useIpcRenderer(
      (ipc) => {
        ipc.on('view-apparatus', (_, data: any) => {
          dispatch(
            toggleVisibilityApparatus({
              id: data.id,
              visible: !data.visible
            })
          )
        })
      },
      [window?.electron?.ipcRenderer]
    )

    useEffect(() => {
      window?.menu?.disableReferencesMenuItems(disabledRemainingApparatusesTypes)
    }, [window?.menu, disabledRemainingApparatusesTypes])

    useEffect(() => {
      const items = apparatuses.map((apparatus) => {
        return {
          id: apparatus.id,
          title: apparatus.title,
          visible: apparatus.visible,
          disabled: false
        }
      })
      window?.menu?.updateViewApparatusesMenuItems(items)
    }, [apparatuses, window?.menu])

    useEffect(() => {
      if (!apparatusesData) return
      apparatusesData.forEach((data: any, index: number) => {
        const editor = editorRefs.current[apparatuses[index].id]
        if (!editor) return
        editor.setJSON(data.content)
      })
    }, [apparatusesData])

    useEffect(() => {
      const taskId = rendererLogger.startTask('TextEditor', 'Load apparatuses')
      async function loadApparatuses() {
        const apparatuses = (await window?.doc?.getApparatuses()) as DocumentApparatus[]
        setApparatusesData(apparatuses)
        dispatch(createApparatusesFromDocument(apparatuses))
      }
      loadApparatuses()
      rendererLogger.endTask(taskId, 'TextEditor', 'Load apparatuses action completed')
    }, [window?.doc])

    const updateTextHandler = useCallback(
      (_: EditorData) => {
        const newApparatuses = apparatuses.map((apparatus) => {
          return {
            type: apparatus.type,
            title: apparatus.title,
            visible: apparatus.visible,
            content: editorRefs.current[apparatus.id]?.getJSON()
          } as DocumentApparatus
        }) as DocumentApparatus[]
        window?.doc?.setApparatuses(newApparatuses)
      },
      [apparatuses, editorRefs]
    )

    const handleClick = useSingleAndDoubleClick(
      () => {},
      () => {
        const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
        ;(async () => {
          await delay(100)
          setEditingApparatus(apparatusRef.current)
          await delay(100)
          inputRef.current?.focus()
          inputRef.current?.select()
        })()
      },
      450
    )

    const handlePointerEnter = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault()
      const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
      ;(async () => {
        await delay(10)
        setDraggingDirection('y')
      })()
    }, [])

    const handleDragEnd = useCallback(
      (event) => {
        event.preventDefault()
        const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
        ;(async () => {
          await delay(100)
          setDraggingDirection(false)
        })()
      },
      [visibleApparatuses]
    )

    const handleAddNewApparatus = (type: ApparatusType, index: number) => {
      dispatch(
        addApparatusAfterIndex({
          type: type,
          index
        })
      )
    }

    const handleChangeType = (id: string, type: ApparatusType) => {
      dispatch(
        changeApparatusType({
          id: id,
          type: type
        })
      )
    }

    const [deleteApparatusDialogOpen, setDeleteApparatusDialogOpen] = useState<{
      open: boolean
      apparatus?: Apparatus
    }>({ open: false })

    // // SET FIRST APPARATUS AS EXPANDED
    useEffect(() => {
      if (visibleApparatuses.length === 1) setExpandedApparatuses([visibleApparatuses[0]])
    }, [visibleApparatuses])

    return (
      <>
        <div className={cn('h-full overflow-y-auto')}>
          <ReorderGroup
            items={apparatuses}
            onReorder={(newTabs) => dispatch(updateVisibleApparatuses(newTabs))}
            className={cn(expandedApparatuses.length > 0 ? 'h-full' : 'h-auto')}
          >
            {visibleApparatuses.map((item, index) => (
              <ReorderItem
                id={item.id}
                item={item}
                key={item.id}
                drag={draggingDirection}
                onDragEnd={(event) => handleDragEnd(event)}
                className={cn(
                  item !== visibleApparatuses[0] && 'border-t border-grey-70 dark:border-grey-40',
                  !expandedApparatuses.includes(item) &&
                    item === visibleApparatuses[visibleApparatuses.length - 1] &&
                    expandedApparatuses.length === 0 &&
                    'border-b border-grey-70 dark:border-grey-40',
                  'relative flex items-center overflow-hidden select-none',
                  'w-full',
                  expandedApparatuses.includes(item) ? 'flex-1' : 'flex-none'
                )}
              >
                <motion.div className="flex flex-col w-full h-full">
                  <motion.nav className={cn('h-8 px-2 flex items-center justify-between')}>
                    <motion.div
                      className="cursor-grab active:cursor-grabbing"
                      onPointerEnter={(event) => handlePointerEnter(event)}
                    >
                      <DragIndicator
                        color="currentColor"
                        intent="primary"
                        variant="tonal"
                        size="small"
                      />
                    </motion.div>
                    <motion.span className="text-center text-xs font-medium">
                      {editingApparatus?.id === item.id ? (
                        <Input
                          ref={inputRef}
                          autoFocus
                          className="w-full border-none focus-visible:ring-0 !text-center !text-xs !font-medium shadow-none"
                          value={editingApparatus.title}
                          onChange={(e) => {
                            setEditingApparatus({
                              ...editingApparatus,
                              title: e.target.value
                            })
                          }}
                          onBlur={(e) => {
                            setEditingApparatus({
                              ...editingApparatus,
                              title: e.target.value
                            })
                          }}
                          onKeyDown={(e) => {
                            if (e.key == 'Escape') {
                              e.preventDefault()
                              setEditingApparatus(null)
                            } else if (e.key === 'Enter' && editingApparatus.title.length > 0) {
                              const apparatusesTitles = apparatuses.map(
                                (apparatus) => apparatus.title
                              )
                              if (
                                apparatusesTitles.includes(editingApparatus.title) &&
                                editingApparatus.title !== item.title
                              ) {
                                return
                              }

                              dispatch(
                                changeApparatusTitle({
                                  id: editingApparatus.id,
                                  title: editingApparatus.title
                                })
                              )
                              setEditingApparatus(null)
                            }
                          }}
                        />
                      ) : (
                        <motion.span
                          onClick={() => {
                            apparatusRef.current = item
                            handleClick()
                          }}
                        >
                          {item.title} ({apparatusTypeName(item.type)})
                        </motion.span>
                      )}
                    </motion.span>
                    <motion.div className="relative space-x-2">
                      <motion.button
                        onPointerDown={(event) => {
                          event.stopPropagation()
                        }}
                        initial={false}
                        animate={{
                          backgroundColor: 'transparent'
                        }}
                        onClick={() => {
                          const newExpandedApparatuses = expandedApparatuses.includes(item)
                            ? expandedApparatuses.filter((apparatus) => apparatus.id !== item.id)
                            : [...expandedApparatuses, item]

                          setExpandedApparatuses(newExpandedApparatuses)
                        }}
                        whileHover={{
                          scale: 1.1,
                          transition: { duration: 0.2 }
                        }}
                        children={<UnfoldMore color="currentColor" className={cn('w-4 h-4')} />}
                      />
                      {/* Options */}
                      <DropdownMenu
                        onOpenChange={(_) => {
                          setEditorRef(editorRefs.current[item.id])
                        }}
                      >
                        <DropdownMenuTrigger asChild>
                          <motion.button
                            onPointerDown={(event) => {
                              event.stopPropagation()
                              setEditorRef(editorRefs.current[item.id])
                            }}
                            initial={false}
                            animate={{
                              backgroundColor: 'transparent'
                            }}
                            whileHover={{
                              scale: 1.1,
                              transition: { duration: 0.2 }
                            }}
                            children={
                              <More
                                color="currentColor"
                                intent="primary"
                                variant="tonal"
                                size="small"
                              />
                            }
                          />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              {t('apparatuses.options.changeType')}
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                              <DropdownMenuSubContent>
                                {types.map((type: ApparatusType) => (
                                  <DropdownMenuItem
                                    key={type}
                                    disabled={
                                      Boolean(editorRef?.state?.text?.length) ||
                                      (hasOneCriticalApparatus && item.type === 'CRITICAL') ||
                                      (type === 'INNER_MARGIN' &&
                                        apparatusesTypes.includes('INNER_MARGIN')) ||
                                      (type === 'OUTER_MARGIN' &&
                                        apparatusesTypes.includes('OUTER_MARGIN'))
                                    }
                                    onClick={() => handleChangeType(item.id, type)}
                                  >
                                    {item.type === type && <Check className="w-4 h-4" />}
                                    {apparatusTypeName(type as Apparatus['type'])}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                          </DropdownMenuSub>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              const delay = (ms: number) =>
                                new Promise((resolve) => setTimeout(resolve, ms))
                              ;(async () => {
                                await delay(100)
                                setEditingApparatus(item)
                                await delay(100)
                                inputRef.current?.focus()
                                inputRef.current?.select()
                              })()
                            }}
                          >
                            {t('apparatuses.options.rename')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={apparatuses.length === 1}
                            onClick={() => {
                              const newExpandedApparatuses = expandedApparatuses.filter(
                                (apparatus) => apparatus.id !== item.id
                              )
                              setExpandedApparatuses(newExpandedApparatuses)
                              dispatch(
                                toggleVisibilityApparatus({
                                  id: item.id,
                                  visible: !item.visible
                                })
                              )
                            }}
                          >
                            {t('apparatuses.options.hide')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={
                              apparatuses.length === 1 ||
                              (hasOneCriticalApparatus && item.type === 'CRITICAL')
                            }
                            onClick={() => {
                              const state = editorRefs.current[item.id]?.state
                              const characters = state?.characters ?? 0
                              if (characters === 0) {
                                const newExpandedApparatuses = expandedApparatuses.filter(
                                  (apparatus) => apparatus.id !== item.id
                                )
                                setExpandedApparatuses(newExpandedApparatuses)
                                dispatch(removeApparatus(item))
                                if (editorRefs.current[item.id]) delete editorRefs.current[item.id]

                                return
                              }

                              setDeleteApparatusDialogOpen({ open: true, apparatus: item })
                            }}
                          >
                            {t('apparatuses.options.delete')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => {}}>
                            <Check className="w-4 h-4" />
                            {t('apparatuses.options.showNoteHighlights')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {}}>
                            <Check className="w-4 h-4" />
                            {t('apparatuses.options.showCommentHighlights')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => {}}>
                            <Check className="w-4 h-4" />
                            {t('apparatuses.options.showInPrint')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      {/* Add new apparatus */}
                      <DropdownMenu
                        onOpenChange={(_) => {
                          setEditorRef(editorRefs.current[item.id])
                        }}
                      >
                        <DropdownMenuTrigger asChild>
                          <motion.button
                            onPointerDown={(event) => {
                              event.stopPropagation()
                              setEditorRef(editorRefs.current[item.id])
                            }}
                            initial={false}
                            animate={{
                              backgroundColor: 'transparent'
                            }}
                            whileHover={{
                              scale: 1.1,
                              transition: { duration: 0.2 }
                            }}
                            children={
                              <PlusSimple
                                color="currentColor"
                                intent="primary"
                                variant="tonal"
                                size="small"
                              />
                            }
                          />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {enabledRemainingApparatusesTypes.map((type) => (
                            <DropdownMenuItem
                              key={type}
                              onClick={() => handleAddNewApparatus(type, index)}
                            >
                              Add {apparatusTypeName(type as Apparatus['type'])}
                            </DropdownMenuItem>
                          ))}
                          {enabledRemainingApparatusesTypes.length > 0 &&
                            disabledRemainingApparatusesTypes.length > 0 && (
                              <DropdownMenuSeparator />
                            )}
                          {disabledRemainingApparatusesTypes.map((type: string) => (
                            <DropdownMenuItem key={type} disabled>
                              {apparatusTypeName(type as Apparatus['type'])}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </motion.div>
                  </motion.nav>
                  <AnimatePresence>
                    <motion.div
                      initial={{ height: 0, opacity: 0, visibility: 'hidden' }}
                      animate={{
                        height: expandedApparatuses.includes(item) ? 'auto' : '0px',
                        opacity: expandedApparatuses.includes(item) ? 1 : 0,
                        visibility: expandedApparatuses.includes(item) ? 'visible' : 'hidden'
                      }}
                      exit={{
                        height: 0,
                        opacity: 0,
                        visibility: 'hidden'
                      }}
                      className="overflow-hidden flex-1"
                    >
                      <TextEditor
                        className={cn(
                          'flex-1 overflow-auto relative w-full',
                          !expandedApparatuses.includes(item) && 'h-0'
                        )}
                        ref={(el: HTMLTextEditorElement) => (editorRefs.current[item.id] = el)}
                        onFocusEditor={() => {
                          setEditorRef(editorRefs.current[item.id])
                          dispatch(setCanAddBookmark(false))
                          onFocusEditor()
                        }}
                        commentHighlighted={true}
                        onUpdate={(editor: EditorData) => {
                          updateTextHandler(editor)
                        }}
                        onEmphasisStateChange={(emphasisState) => {
                          dispatch(setEmphasisState(emphasisState))
                        }}
                        onSelectionMarks={(selectionMarks) => {
                          const commentMarksIds = selectionMarks
                            .filter((mark) => mark.type === 'comment')
                            ?.map((mark) => mark?.attrs?.id)
                          if (commentMarksIds.length > 0) {
                            dispatch(selectCommentWithId(commentMarksIds[0]))
                            sidebar.setOpen(true)
                            dispatchEditor(setSelectedSideviewTabIndex(0))
                          } else {
                            dispatch(selectComment(null))
                          }
                        }}
                        onCommentCreated={async (id, content) => {
                          const userInfo =
                            (await window?.system?.getUserInfo()) as UserInfo
                          dispatch(
                            addComment({
                              id: id,
                              content: content ?? '',
                              target: 'APPARATUS_TEXT',
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
                        onChangeComments={(comments) => {
                          dispatch(
                            updateCommentList({ target: 'APPARATUS_TEXT', comments: comments })
                          )
                        }}
                        onChangeComment={(data) => {
                          dispatch(
                            editCommentContent({ commentId: data.id, content: data.content })
                          )
                        }}
                        onCanUndo={(value) => {
                          dispatch(setCanUndo(value))
                        }}
                        onCanRedo={(value) => {
                          dispatch(setCanRedo(value))
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
                              editorRef?.addComment()
                            }
                          }
                        ]}
                      />
                    </motion.div>
                  </AnimatePresence>
                </motion.div>
              </ReorderItem>
            ))}
          </ReorderGroup>
        </div>

        <Dialog
          open={deleteApparatusDialogOpen.open}
          onOpenChange={() => setDeleteApparatusDialogOpen({ open: false })}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('delete_apparatus_dialog.title')}</DialogTitle>
              <DialogDescription>{t('delete_apparatus_dialog.description')}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="submit"
                intent="secondary"
                variant="filled"
                size="mini"
                onClick={() => setDeleteApparatusDialogOpen({ open: false })}
              >
                <span>{t('delete_apparatus_dialog.buttons.cancel')}</span>
              </Button>
              <Button
                type="submit"
                intent="primary"
                variant="filled"
                size="mini"
                onClick={() => {
                  setDeleteApparatusDialogOpen({ open: false })
                  const apparatus = deleteApparatusDialogOpen.apparatus
                  if (!apparatus) return

                  const newExpandedApparatuses = expandedApparatuses.filter(
                    (apparatus) => apparatus.id !== apparatus.id
                  )
                  setExpandedApparatuses(newExpandedApparatuses)
                  dispatch(removeApparatus(apparatus))
                  if (editorRefs.current[apparatus.id]) {
                    delete editorRefs.current[apparatus.id]
                  }
                }}
              >
                <span>{t('delete_apparatus_dialog.buttons.delete')}</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    )
  }
)

export default Apparatuses
