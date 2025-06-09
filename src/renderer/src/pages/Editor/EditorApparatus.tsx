import PlusSimple from "@/components/icons/PlusSimple";
import UnfoldMore from "@/components/icons/UnfoldMore";
import { AnimatePresence, motion, Reorder, MotionGlobalConfig } from "framer-motion";
import { cn } from "@/lib/utils";
import { ForwardedRef, forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import DragIndicator from "@/components/icons/DragIndicator";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuPortal,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import More from "@/components/icons/More";
import Check from "@/components/icons/Check";
import { useDispatch, useSelector } from "react-redux";
import {
    selectApparatuses,
    selectApparatusesTypes,
    selectCanEdit,
    selectDisabledRemainingApparatusesTypes,
    selectEnabledRemainingApparatusesTypes,
    selectVisibleApparatuses
} from "./store/editor/editor.selector";
import {
    addApparatusAfterIndex,
    changeApparatusTitle,
    changeApparatusType,
    createApparatusesFromDocument,
    removeApparatus,
    setCanAddBookmark,
    toggleVisibilityApparatus,
    updateApparatuses
} from "./store/editor/editor.slice";
import TextEditor, { EditorData, HTMLTextEditorElement } from "@/components/text-editor";
import { Input } from "@/components/ui/input";
import { rendererLogger } from "@/utils/logger";
import { useIpcRenderer } from "@/hooks/use-ipc-renderer";
import useSingleAndDoubleClick from "@/hooks/use-single-double-click";


const EditorApparatusLayout = ({
    children,
    className
}: {
    children: React.ReactNode,
    className?: string
}) => {
    return (
        <div className={cn("h-full overflow-y-auto", className)}>
            {children}
        </div>
    )
}

interface EditorApparatusProps {
    onFocusEditor: () => void
}

export const EditorApparatus = forwardRef(({
    onFocusEditor
}: EditorApparatusProps, ref: ForwardedRef<unknown>) => {
    const apparatusRef = useRef<Apparatus | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const editorRefs = useRef<{ [key: string]: HTMLTextEditorElement }>({});
    const [editorRef, setEditorRef] = useState<HTMLTextEditorElement>();

    useImperativeHandle(ref, () => {
        return {
            focus: () => {
                editorRef?.focus();
            },
            undo: (action?: HistoryAction) => {
                editorRef?.undo(action);
            },
            redo: () => {
                editorRef?.redo();
            },
            setHeadingLevel: (headingLevel: number) => {
                editorRef?.setHeadingLevel(headingLevel);
            },
            setBody: () => {
                editorRef?.setBody();
            },
            setFontFamily: (fontFamily: string) => {
                editorRef?.setFontFamily(fontFamily);
            },
            setFontSize: (fontSize: string) => {
                editorRef?.setFontSize(fontSize);
            },
            setBold: (bold: boolean) => {
                editorRef?.setBold(bold);
            },
            setItalic: (italic: boolean) => {
                editorRef?.setItalic(italic);
            },
            setUnderline: (underline: boolean) => {
                editorRef?.setUnderline(underline);
            },
            setTextColor: (textColor: string) => {
                editorRef?.setTextColor(textColor);
            },
            setHighlightColor: (highlightColor: string) => {
                editorRef?.setHighlightColor(highlightColor);
            },
            setBlockquote: (blockquote: boolean) => {
                editorRef?.setBlockquote(blockquote);
            },
            setTextAlignment: (alignment: string) => {
                editorRef?.setTextAlignment(alignment);
            },
            setLineSpacing: (spacing: Spacing) => {
                editorRef?.setLineSpacing(spacing);
            },
            setListStyle: (style: BulletStyle) => {
                editorRef?.setListStyle(style);
            },
            setSuperscript: (superscript: boolean) => {
                editorRef?.setSuperscript(superscript);
            },
            setSubscript: (subscript: boolean) => {
                editorRef?.setSubscript(subscript);
            },
            increaseIndent: () => {
                editorRef?.increaseIndent();
            },
            decreaseIndent: () => {
                editorRef?.decreaseIndent();
            },
            showCustomSpacing: () => {
                // setIsCustomSpacingOpen(true);
            },
            showResumeNumbering: () => {
                // setIsResumeNumberingOpen(true);
            },
            continuePreviousNumbering: () => {
                editorRef?.continuePreviousNumbering();
            },
            // @ts-ignore
            addBookmark: (categoryId?: string) => {
                // bookmarkCategoryIdRef.current = categoryId;
                // registerBookmark();
            },
            unsetBookmark: () => {
                editorRef?.unsetBookmark();
            },
            toggleNonPrintingCharacters: () => {
                editorRef?.toggleNonPrintingCharacters();
            },
            // @ts-ignore
            scrollToBookmark: (id: string) => {
                // criticalTextEditorRef?.current?.scrollToBookmark(id);
            },
            deleteBookmarks: (bookmarks: Bookmark[]) => {
                editorRef?.deleteBookmarks(bookmarks);
            },
            // @ts-ignore
            addComment: (categoryId?: string) => {
                // commentCategoryIdRef.current = categoryId;
                // registerComment();
            },
            unsetComment: () => {
                editorRef?.unsetComment();
            },
            // @ts-ignore
            scrollToComment: (comment: AppComment) => {
                // handleScrollToComment(comment);
            },
            deleteComments: (comments: AppComment[]) => {
                editorRef?.deleteComments(comments);
            },
        };
    });

    MotionGlobalConfig.skipAnimations = true;

    const dispatch = useDispatch()

    const apparatuses = useSelector(selectApparatuses)
    const visibleApparatuses = useSelector(selectVisibleApparatuses)
    const apparatusesTypes = useSelector(selectApparatusesTypes)
    const canEdit = useSelector(selectCanEdit)
    const enabledRemainingApparatusesTypes = useSelector(selectEnabledRemainingApparatusesTypes)
    const disabledRemainingApparatusesTypes = useSelector(selectDisabledRemainingApparatusesTypes)
    const [expandedApparatuses, setExpandedApparatuses] = useState<Apparatus[]>([])
    const [editingApparatus, setEditingApparatus] = useState<Apparatus | null>(null);
    const [apparatusesData, setApparatusesData] = useState<any[]>([]);


    const [dragging, setDragging] = useState<"y" | "x" | undefined>(undefined)

    const types = ['CRITICAL', 'PAGE_NOTES', 'SECTION_NOTES', 'INNER_MARGIN', 'OUTER_MARGIN']
    const apparatusTypeName = (type: Apparatus['type']) => {
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

    useIpcRenderer((ipc) => {
        ipc.on("view-apparatus", (_, data: any) => {
            dispatch(toggleVisibilityApparatus({
                id: data.id,
                visible: !data.visible
            }))
        })
    }, [window.electron.ipcRenderer])

    useEffect(() => {
        window.menu.disableReferencesMenuItems(disabledRemainingApparatusesTypes)
    }, [window.menu, disabledRemainingApparatusesTypes])

    useEffect(() => {
        const items = apparatuses.map((apparatus) => {
            return {
                id: apparatus.id,
                title: apparatus.title,
                visible: apparatus.visible,
                disabled: apparatus.disabled,
            }
        })
        window.menu.updateViewApparatusesMenuItems(items)
    }, [apparatuses, window.menu])

    useEffect(() => {
        if (!apparatusesData) return;
        apparatusesData.forEach((data: any, index: number) => {
            const editor = editorRefs.current[apparatuses[index].id]
            editor.setJSON(data.content)
        })
    }, [apparatusesData])

    useEffect(() => {
        const taskId = rendererLogger.startTask("TextEditor", "Load apparatuses");
        async function loadApparatuses() {
            const apparatuses = await window.doc.getApparatuses()
            setApparatusesData(apparatuses)
            dispatch(createApparatusesFromDocument(apparatuses))
        }
        loadApparatuses()
        rendererLogger.endTask(taskId, "TextEditor", "Load apparatuses action completed");
    }, [window.doc.getApparatuses]);

    const updateTextHandler = useCallback((_: EditorData) => {
        const newApparatuses = apparatuses.map((apparatus) => {
            return {
                type: apparatus.type,
                title: apparatus.title,
                content: editorRefs.current[apparatus.id]?.getJSON()
            }
        })
        window.doc.setApparatuses(newApparatuses)
    }, [apparatuses, editorRefs])

    const handleClick = useSingleAndDoubleClick(
        () => { },
        () => {
            const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
            (async () => {
                await delay(100);
                setEditingApparatus(apparatusRef.current)
                await delay(100);
                inputRef.current?.focus()
                inputRef.current?.select()
            })();
        },
        450
    );

    const handlePointerEnter = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
        event.preventDefault()
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
        (async () => {
            await delay(10);
            setDragging("y")
        })();
    }, [])

    const handleDragEnd = useCallback((event) => {
        event.preventDefault()
        // const apparatusSort: TElement[] = visibleApparatuses.map((el) => ({
        //     id: el.id,
        //     title: el.title,
        //     columns: 1,
        //     sectionType: converterFromEditorToSetup(el.type) ?? '',
        //     disabled: el.disabled,
        //     type: 'apparatus',
        //     visible: true
        // }))
        //dispatch(updateApparatusArrayInCritical([setupDialogState.critical.apparatusDetails.find((el) => el.type === 'text'), ...apparatusSort]));
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
        (async () => {
            await delay(10);
            setDragging(undefined)
        })();
    }, [visibleApparatuses])

    const handleAddNewApparatus = (type: string, index: number) => {
        // setPreviousVisibleApparatus(visibleApparatuses);
        dispatch(addApparatusAfterIndex({
            type: type as Apparatus['type'],
            index
        }))

    }

    const handleChangeType = (id: string, type: string) => {
        // console.log({ apparatusDetails: setupDialogState.critical.apparatusDetails, id })
        dispatch(changeApparatusType({
            id: id,
            type: type as Apparatus['type']
        }))
        /* 
                const updatedApparatusDetails = setupDialogState.critical.apparatusDetails.map(app => {
                    if (app.id === id) {
                        return {
                            ...app,
                            sectionType: converterFromEditorToSetup(type as Apparatus['type']) || app.sectionType
                        };
                    }
                    return app;
                });
        
                dispatch(updateApparatusArrayInCritical(updatedApparatusDetails)); */
    }


    return (
        <EditorApparatusLayout>
            <Reorder.Group
                as="ul"
                axis="y"
                onReorder={(newTabs) => dispatch(updateApparatuses(newTabs))}
                className={cn(
                    "flex flex-col w-full",
                    expandedApparatuses.length > 0 ? "h-full" : "h-auto"
                )}
                values={apparatuses}
            >
                <AnimatePresence>
                    {visibleApparatuses.map((item, index) => (
                        <Reorder.Item
                            id={item.id}
                            key={item.id}
                            value={item}
                            initial={{
                                opacity: 1,
                                x: 0
                            }}
                            animate={{
                                opacity: 1,
                                x: 0,
                                transition: {
                                    duration: 0.1,
                                    ease: 'easeInOut'
                                }
                            }}
                            exit={{
                                opacity: 0,
                                x: 20,
                                transition: {
                                    duration: 0.15
                                }
                            }}
                            whileDrag={{
                                transition: {
                                    ease: 'easeInOut'
                                }
                            }}
                            drag={dragging}
                            onDragEnd={(event) => handleDragEnd(event)}
                            className={cn(
                                'bg-white',
                                item !== visibleApparatuses[0] && 'border-t border-grey-70',
                                !expandedApparatuses.includes(item) && item === visibleApparatuses[visibleApparatuses.length - 1] && expandedApparatuses.length === 0 && 'border-b border-grey-70',
                                'relative flex items-center overflow-hidden select-none',
                                "w-full",
                                expandedApparatuses.includes(item) ? "flex-1" : "flex-none"
                            )}>
                            <motion.div
                                className='flex flex-col w-full h-full'>
                                <motion.nav
                                    className={cn("h-8 px-2 flex items-center justify-between")}>
                                    <motion.div className='cursor-grab active:cursor-grabbing'
                                        onPointerEnter={(event) => handlePointerEnter(event)}
                                    >
                                        <DragIndicator intent='primary' variant='tonal' size='small' />
                                    </motion.div>
                                    <motion.span className="text-center text-xs font-medium">
                                        {editingApparatus?.id === item.id
                                            ? (
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
                                                        if (e.key == "Escape") {
                                                            e.preventDefault()
                                                            setEditingApparatus(null)
                                                        } else if (e.key === "Enter" && editingApparatus.title.length > 0) {
                                                            console.log("editingApparatus", editingApparatus)
                                                            const apparatusesTitles = apparatuses.map((apparatus) => apparatus.title)
                                                            if (apparatusesTitles.includes(editingApparatus.title) && editingApparatus.title !== item.title) {
                                                                return
                                                            }

                                                            dispatch(changeApparatusTitle({
                                                                id: editingApparatus.id,
                                                                title: editingApparatus.title
                                                            }))

                                                            // const updatedApparatusDetails = setupDialogState.critical.apparatusDetails.map(app => {
                                                            //     if (app.id === editingApparatus.id) {
                                                            //         return {
                                                            //             ...app,
                                                            //             title: editingApparatus.title
                                                            //         };
                                                            //     } else if (app.id === "apparatus1" && setupDialogState.critical.apparatusDetails.length === 2) {
                                                            //         return {
                                                            //             ...app,
                                                            //             title: editingApparatus.title
                                                            //         };

                                                            //     }
                                                            //     return app;
                                                            // });
                                                            // console.log("🚀 ~ updatedApparatusDetails:", updatedApparatusDetails)

                                                            // dispatch(updateApparatusArrayInCritical(updatedApparatusDetails));

                                                            setEditingApparatus(null)
                                                        }
                                                    }}
                                                />
                                            )
                                            : (
                                                <motion.span onClick={() => {
                                                    apparatusRef.current = item
                                                    handleClick()
                                                }}>
                                                    {item.title} ({apparatusTypeName(item.type)})
                                                </motion.span>
                                            )
                                        }
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
                                                    ? expandedApparatuses.filter(apparatus => apparatus.id !== item.id)
                                                    : [...expandedApparatuses, item]

                                                setExpandedApparatuses(newExpandedApparatuses)
                                            }}
                                            whileHover={{
                                                scale: 1.1,
                                                transition: { duration: 0.2 }
                                            }}
                                            children={<UnfoldMore className={cn("w-4 h-4")} />}
                                        />
                                        <DropdownMenu onOpenChange={(_) => {
                                            setEditorRef(editorRefs.current[item.id]);
                                        }}>
                                            <DropdownMenuTrigger asChild>
                                                <motion.button
                                                    onPointerDown={(event) => {
                                                        event.stopPropagation()
                                                        setEditorRef(editorRefs.current[item.id]);
                                                    }}
                                                    initial={false}
                                                    animate={{
                                                        backgroundColor: 'transparent'
                                                    }}
                                                    whileHover={{
                                                        scale: 1.1,
                                                        transition: { duration: 0.2 }
                                                    }}
                                                    children={<More intent='primary' variant='tonal' size='small' />}
                                                />
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuSub>
                                                    <DropdownMenuSubTrigger>
                                                        Change type
                                                    </DropdownMenuSubTrigger>
                                                    <DropdownMenuPortal>
                                                        <DropdownMenuSubContent>
                                                            {types.map((type: string) => (
                                                                <DropdownMenuItem
                                                                    key={type}
                                                                    disabled={
                                                                        Boolean(editorRef?.state?.text?.length)
                                                                        || (type === 'INNER_MARGIN' && apparatusesTypes.includes('INNER_MARGIN'))
                                                                        || (type === 'OUTER_MARGIN' && apparatusesTypes.includes('OUTER_MARGIN'))
                                                                    }
                                                                    onClick={() => handleChangeType(item.id, type)}>
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
                                                        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
                                                        (async () => {
                                                            await delay(100);
                                                            setEditingApparatus(item);
                                                            await delay(100);
                                                            inputRef.current?.focus();
                                                            inputRef.current?.select();
                                                        })();
                                                    }}>
                                                    Rename
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    disabled={apparatuses.length === 1}
                                                    onClick={() => {
                                                        const newExpandedApparatuses = expandedApparatuses.filter(apparatus => apparatus.id !== item.id)
                                                        setExpandedApparatuses(newExpandedApparatuses)
                                                        dispatch(toggleVisibilityApparatus({
                                                            id: item.id,
                                                            visible: !item.visible
                                                        }))
                                                        /*        const updatedApparatusDetails = setupDialogState.critical.apparatusDetails.map(app => {
                                                                   if (app.id === item.id) {
                                                                       return {
                                                                           ...app,
                                                                           visible: false
                                                                       };
                                                                   }
                                                                   return app;
                                                               });
       
                                                               dispatch(updateApparatusArrayInCritical(updatedApparatusDetails)); */
                                                    }}>
                                                    Hide
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    disabled={apparatuses.length === 1}
                                                    onClick={() => {
                                                        const newExpandedApparatuses = expandedApparatuses.filter(apparatus => apparatus.id !== item.id);
                                                        setExpandedApparatuses(newExpandedApparatuses);

                                                        dispatch(removeApparatus(item));
                                                        /* 
                                                                                                                const updatedApparatusDetails = setupDialogState.critical.apparatusDetails.filter(
                                                                                                                    app => app.id !== item.id
                                                                                                                );
                                                        
                                                                                                                dispatch(updateApparatusArrayInCritical(updatedApparatusDetails)); */

                                                        if (editorRefs.current[item.id]) {
                                                            delete editorRefs.current[item.id];
                                                        }
                                                    }}>
                                                    Delete
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={() => { }}>
                                                    <Check className="w-4 h-4" />
                                                    Show Note highlights
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => { }}>
                                                    <Check className="w-4 h-4" />
                                                    Show Comment highlights
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={() => { }}>
                                                    <Check className="w-4 h-4" />
                                                    Show in print
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                        <DropdownMenu onOpenChange={(_) => {
                                            setEditorRef(editorRefs.current[item.id]);
                                        }}>
                                            <DropdownMenuTrigger asChild>
                                                <motion.button
                                                    onPointerDown={(event) => {
                                                        event.stopPropagation()
                                                        setEditorRef(editorRefs.current[item.id]);
                                                    }}
                                                    initial={false}
                                                    animate={{
                                                        backgroundColor: 'transparent'
                                                    }}
                                                    whileHover={{
                                                        scale: 1.1,
                                                        transition: { duration: 0.2 }
                                                    }}
                                                    children={<PlusSimple intent='primary' variant='tonal' size='small' />}
                                                />
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                {enabledRemainingApparatusesTypes.map((type: string) => (
                                                    <DropdownMenuItem
                                                        key={type}
                                                        onClick={() => handleAddNewApparatus(type, index)}>
                                                        Add {apparatusTypeName(type as Apparatus['type'])}
                                                    </DropdownMenuItem>
                                                ))}
                                                {enabledRemainingApparatusesTypes.length > 0 && disabledRemainingApparatusesTypes.length > 0 && <DropdownMenuSeparator />}
                                                {disabledRemainingApparatusesTypes.map((type: string) => (
                                                    <DropdownMenuItem
                                                        key={type}
                                                        disabled>
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
                                            height: expandedApparatuses.includes(item) ? "auto" : "0px",
                                            opacity: expandedApparatuses.includes(item) ? 1 : 0,
                                            visibility: expandedApparatuses.includes(item) ? 'visible' : 'hidden'
                                        }}
                                        exit={{
                                            height: 0,
                                            opacity: 0,
                                            visibility: 'hidden'
                                        }}
                                        className="overflow-hidden flex-1">
                                        <TextEditor
                                            className={cn(
                                                "flex-1 overflow-auto relative w-full",
                                                !expandedApparatuses.includes(item) && "h-0"
                                            )}
                                            ref={(el: HTMLTextEditorElement) => editorRefs.current[item.id] = el}
                                            onFocusEditor={() => {
                                                setEditorRef(editorRefs.current[item.id]);
                                                dispatch(setCanAddBookmark(false));
                                                onFocusEditor()
                                            }}
                                            canEdit={canEdit}
                                            onUpdate={(editor: EditorData) => {
                                                updateTextHandler(editor)
                                            }}

                                        // onEmphasisStateChange={(emphasisState) => {
                                        //     dispatch(setEmphasisState(emphasisState))
                                        // }}
                                        // onHistoryStateChange={(historyState) => {
                                        //     dispatch(setHistory(historyState))
                                        // }}
                                        // onChangeComments={(comments) => {
                                        //     dispatch(updateCommentList({ target: 'APPARATUS_TEXT', comments: comments }))
                                        // }}
                                        // onChangeComment={(data) => {
                                        //     dispatch(editCommentContent({ commentId: data.id, content: data.content }))
                                        // }}
                                        // onSelectionMarks={(selectionMarks) => {
                                        //     const commentMarksIds = selectionMarks.filter(mark => mark.type === 'comment')?.map(mark => mark?.attrs?.id)
                                        //     dispatch(selectCommentWithId(commentMarksIds[0]))
                                        //     if (commentMarksIds.length > 0) {
                                        //         dispatch(setSidebarOpen(true))
                                        //         dispatch(setSelectedSidebarTabIndex(0))
                                        //     }
                                        // }}
                                        // onCommentCreated={async (id, content) => {
                                        //     const userInfo = await window.system.getUserInfo() as unknown as UserInfo
                                        //     dispatch(addComment({
                                        //         id: id,
                                        //         content: content ?? '',
                                        //         target: targetRef.current,
                                        //         categoryId: commentCategoryIdRef.current,
                                        //         userInfo: userInfo.username
                                        //     }));
                                        //     dispatch(setSidebarOpen(true))
                                        //     dispatch(setSelectedSidebarTabIndex(0))
                                        //     onRegisterComment(id, commentCategoryIdRef.current)
                                        // }}
                                        // onCanUndo={(value) => {
                                        //     dispatch(setCanUndo(value));
                                        // }}
                                        // onCanRedo={(value) => {
                                        //     dispatch(setCanRedo(value));
                                        // }}
                                        />
                                    </motion.div>
                                </AnimatePresence>
                            </motion.div>
                        </Reorder.Item>
                    ))}
                </AnimatePresence>
            </Reorder.Group>
        </EditorApparatusLayout>
    )
})