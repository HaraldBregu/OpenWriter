import PlusSimple from "@/components/icons/PlusSimple"
import Button from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { ForwardedRef, forwardRef, memo, useCallback, useImperativeHandle, useMemo, useRef, useState } from "react"
import { Label } from "@/components/ui/label"
import Copy from "@/components/icons/Copy"
import Delete from "@/components/icons/Delete"
import { useEditor } from "../hooks/useEditor"
import { addSiglum, deleteSiglum, duplicateSiglum, updateSiglum } from "../provider"
import RichTextEditor, { HTMLRichTextEditorElement } from "@/lib/tiptap/richtext/rich-text-editor"
import Superscript from "@/components/icons/Superscript"
import Subscript from "@/components/icons/Subscript"
import Underline from "@/components/icons/Underline"
import Beta from "@/components/icons/Beta"
import Bold from "@/components/icons/Bold"
import Divider from "@/components/ui/divider"
import Siglum from "@/components/icons/Siglum"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Italic from "@/components/icons/Italic"
import { useTranslation } from "react-i18next"
import { oneLinerExtensionsConfig } from "@/lib/tiptap/richtext/constants"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"


type SiglumSetupMode = "empty" | "update" | "create"

type SiglumSetupProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    fontFamilyList: string[]
    fontFamilySymbols: CharacterSet
    onSelectFontFamily: (fontFamily: string) => void
    onImportSiglum: () => void
    onExportSiglumList: () => void
}

export const SiglumSetup = ({
    open,
    onOpenChange,
    fontFamilyList,
    fontFamilySymbols,
    onSelectFontFamily,
    onImportSiglum,
    onExportSiglumList
}: SiglumSetupProps) => {
    if (!open)
        return null

    const { t } = useTranslation()
    const [mode, setMode] = useState<SiglumSetupMode>("empty")
    const [state, dispatch] = useEditor()

    const defaultSiglumData: SiglumData = { value: "", content: "" }
    const [siglumId, setSiglumId] = useState<string | null>(null)
    const [siglumDataTitle, setSiglumDataTitle] = useState<SiglumData>(defaultSiglumData)
    const [siglumDataManuscripts, setSiglumDataManuscripts] = useState<SiglumData>(defaultSiglumData)
    const [siglumDataDescription, setSiglumDataDescription] = useState<SiglumData>(defaultSiglumData)

    const editorContainersRef = useRef<any>(null)
    const textEditorToolbarRef = useRef<any>(null)
    const selectedSiglum = useRef<Siglum | null>(null)

    const handleSetMode = useCallback((mode: SiglumSetupMode) => {
        setMode(mode)
        editorContainersRef?.current?.setSiglum(null)
    }, [])

    const handleDeleteSiglum = useCallback((siglum: Siglum) => {
        dispatch(deleteSiglum(siglum))
    }, [])

    const handleDuplicateSiglum = useCallback((siglum: Siglum) => {
        dispatch(duplicateSiglum(siglum))
    }, [])

    const handleUpdateSiglum = useCallback(() => {
        switch (mode) {
            case "update":
                dispatch(updateSiglum(siglumId ?? "", siglumDataTitle, siglumDataManuscripts, siglumDataDescription))
                break
            case "create":
                dispatch(addSiglum(siglumDataTitle, siglumDataManuscripts, siglumDataDescription))
                editorContainersRef?.current?.setSiglum(null)
                break
            default:
                break
        }
    }, [siglumId, siglumDataTitle, siglumDataManuscripts, siglumDataDescription, mode])

    const handleClickSiglum = useCallback((item: Siglum) => {
        setMode("update")
        selectedSiglum.current = item
        editorContainersRef?.current?.setSiglum(item)
    }, [])

    const enabledExportButton = useMemo(() => {
        return state.siglumList.length > 0
    }, [state.siglumList])

    const hasSameSiglum = useMemo(() => {
        const siglumLits = state.siglumList
        const titleContent = siglumDataTitle.content ?? ''
        const hasSameSiglum = siglumLits.some(item => item.siglum.content === titleContent && item.id !== siglumId)
        return hasSameSiglum
    }, [state.siglumList, siglumDataTitle])

    const enabledSaveButton = useMemo(() => {
        const title = siglumDataTitle.value ?? ''
        const manuscripts = siglumDataManuscripts.value ?? ''
        return title.length > 0 && manuscripts.length > 0 && !hasSameSiglum
    }, [siglumDataTitle, siglumDataManuscripts])

    const errorDataTitle = useMemo(() => {
        return hasSameSiglum ? t("siglum.error.title", "##Siglum already exists##") : null
    }, [state.siglumList, siglumDataTitle])


    return (
        <Dialog
            open={open}
            onOpenChange={onOpenChange}>
            <DialogContent
                className={cn("max-w-[60vw] overflow-hidden !gap-0", "[&>button]:hidden", "p-0")}>
                <DialogHeader className={cn("border-b border-grey-80 p-3 max-h-12 bg-grey-95 dark:bg-grey-10")}>
                    <DialogTitle className={cn("text-grey-100 text-center text-[14px] font-[700]")}>
                        {t("siglum.title", "##Siglum##")}
                    </DialogTitle>
                </DialogHeader>
                <SiglumDialogContent>
                    <SiglumDialogLeftContent>
                        <SiglumDialogLeftContentHeader>
                            <Button
                                size="mini"
                                variant="tonal"
                                intent={"secondary"}
                                leftIcon={<PlusSimple className="w-4 h-4" />}
                                onClick={() => {
                                    handleSetMode("create")
                                }}>
                                {t("siglum.create", "##Create##")}
                            </Button>
                            <Button
                                className="border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-4"
                                size="mini"
                                intent={"primary"}
                                onClick={() => {
                                    onImportSiglum()
                                }}>
                                {t("siglum.import", "##Import##")}
                            </Button>
                        </SiglumDialogLeftContentHeader>
                        <SiglumDialogLeftContentBody>
                            <SiglumList
                                items={state.siglumList}
                                itemSelected={selectedSiglum.current}
                                onDelete={handleDeleteSiglum}
                                onDuplicate={handleDuplicateSiglum}
                                onClick={handleClickSiglum}
                            />
                        </SiglumDialogLeftContentBody>
                    </SiglumDialogLeftContent>
                    <SiglumDialogRightContent>
                        {mode === "empty" &&
                            <EmptyStateLayout title={t("siglum.empty.title", "##Create sigla before adding notes##")}>
                                <Button
                                    size="mini"
                                    variant="tonal"
                                    intent="secondary"
                                    leftIcon={<PlusSimple className="w-4 h-4" />}
                                    onClick={() => {
                                        handleSetMode("create")
                                    }}>
                                    {t("siglum.create", "##Create##")}
                                </Button>
                                <Button
                                    className="border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-4"
                                    size="mini"
                                    intent="primary"
                                    onClick={() => {
                                        onImportSiglum()
                                    }}>
                                    {t("siglum.import", "##Import##")}
                                </Button>
                            </EmptyStateLayout>
                        }
                        {(mode === "update" || mode === "create") &&
                            <EditSiglumLayout>
                                <SiglumSetupToolbar
                                    ref={textEditorToolbarRef}
                                    fontFamilyList={fontFamilyList}
                                    fontFamilySymbols={fontFamilySymbols}
                                    onSelectFontFamilySymbolCode={(symbol) => {
                                        editorContainersRef?.current?.insertCharacter(symbol)
                                    }}
                                    siglumList={state.siglumList}
                                    onSetFontFamily={(fontFamily) => {
                                        onSelectFontFamily(fontFamily)
                                        editorContainersRef?.current?.setFontFamily(fontFamily)
                                    }}
                                    onSelectSiglum={(siglum) => {
                                        editorContainersRef?.current?.addSiglum(siglum)
                                    }}
                                    onSetSuperscript={() => {
                                        editorContainersRef?.current?.setSuperscript()
                                    }}
                                    onSetSubscript={() => {
                                        editorContainersRef?.current?.setSubscript()
                                    }}
                                    onSetItalic={() => {
                                        editorContainersRef?.current?.setItalic()
                                    }}
                                    onSetUnderline={() => {
                                        editorContainersRef?.current?.setUnderline()
                                    }}
                                    onSetBold={() => {
                                        editorContainersRef?.current?.setBold()
                                    }}
                                />
                                <SiglumSetupEditorContainer
                                    ref={editorContainersRef}
                                    onUpdateEmphasisState={(emphasisState) => {
                                        textEditorToolbarRef?.current?.setEmphasisState(emphasisState)
                                    }}
                                    errorDataTitle={errorDataTitle}
                                    onUpdateSiglumData={(id, title, manuscripts, description) => {
                                        setSiglumId(id)
                                        setSiglumDataTitle(title)
                                        setSiglumDataManuscripts(manuscripts)
                                        setSiglumDataDescription(description)
                                    }}
                                />
                            </EditSiglumLayout>
                        }
                    </SiglumDialogRightContent>
                </SiglumDialogContent>
                <DialogFooter className={cn("border-t border-grey-80 p-3  max-h-16")}>
                    <Button
                        className="border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 w-24" size="mini"
                        intent={"secondary"}
                        variant={"tonal"}
                        onClick={() => {
                            onOpenChange(false)
                        }}>
                        {t("siglum.cancel", "##Cancel##")}
                    </Button>
                    <Button
                        className="border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 w-24"
                        size="mini"
                        intent={"secondary"}
                        variant={"tonal"}
                        disabled={!enabledExportButton}
                        onClick={() => {
                            onExportSiglumList()
                        }}>
                        {t("siglum.export", "##Export##")}
                    </Button>
                    <Button
                        className="border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 w-24"
                        size="mini"
                        intent={"primary"}
                        disabled={!enabledSaveButton}
                        onClick={() => {
                            handleUpdateSiglum()
                        }}>
                        {t("siglum.save", "##Save##")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

type SiglumListProps = {
    items: Siglum[]
    itemSelected: Siglum | null
    onDelete: (siglum: Siglum) => void
    onDuplicate: (siglum: Siglum) => void
    onClick: (siglum: Siglum) => void
}
const SiglumList = ({
    items,
    itemSelected,
    onDelete,
    onDuplicate,
    onClick
}: SiglumListProps) => {

    const handleClick = useCallback((siglum: Siglum) => {
        onClick(siglum)
    }, [])

    return (
        <ul>
            {items.map((item) => (
                <li
                    key={item.id}
                    className="p-2 cursor-pointer"
                    onClick={(e: React.MouseEvent<HTMLLIElement>) => {
                        e.stopPropagation()
                        handleClick(item)
                    }}>
                    <div className={cn(
                        "flex items-center gap-2 w-full rounded-sm px-2",
                        itemSelected?.id === item.id && "bg-primary"
                    )}>
                        <span className={cn(
                            "text-sm text-gray-900",
                            itemSelected?.id === item.id && "text-white"
                        )}>{item.siglum.value}</span>
                        <div className="ml-auto flex gap-2">
                            <Button
                                intent="secondary"
                                variant="icon"
                                size="iconSm"
                                tabIndex={10}
                                icon={<Copy
                                    color={itemSelected?.id === item.id ? "#ffffff" : "#000"}
                                    intent='secondary'
                                    variant='tonal'
                                    size='small'
                                />}
                                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                    e.stopPropagation()
                                    onDuplicate(item)
                                }}
                                aria-pressed={false}
                                aria-label="Italic"
                                className="border-none shadow-none hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                            />
                            <Button
                                intent="secondary"
                                variant="icon"
                                size="iconSm"
                                tabIndex={10}
                                icon={<Delete
                                    color={itemSelected?.id === item.id ? "#ffffff" : "#000"}
                                    intent='secondary'
                                    variant='tonal'
                                    size='small'
                                />}
                                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                    e.stopPropagation()
                                    onDelete(item)
                                }}
                                aria-pressed={false}
                                aria-label="Italic"
                                className="border-none shadow-none hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                            />
                        </div>
                    </div>
                </li>
            ))}
        </ul>
    )
}

const EmptyStateLayout = memo(({ title, children }: { title: React.ReactNode, children: React.ReactNode }) => {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center">
            <h1 className="font-bold">
                {title}
            </h1>
            <div className="flex gap-2 mt-4">
                {children}
            </div>
        </div>
    )
})

const EditSiglumLayout = memo(({ children }: { children: React.ReactNode }) => {
    return (
        <div className="flex flex-col h-full">
            <div className="flex flex-col gap-4 w-full">
                {children}
            </div>
        </div>
    )
})

const SiglumDialogContent = memo(({ children }: { children: React.ReactNode }) => {
    return (
        <div className="flex flex-row h-[50vh]">
            {children}
        </div>
    )
})

const SiglumDialogLeftContent = memo(({ children }: { children: React.ReactNode }) => {
    return (
        <div className="w-1/3 border-r overflow-y-auto">
            <div className="flex flex-col h-full">
                {children}
            </div>
        </div>
    )
})

const SiglumDialogLeftContentHeader = memo(({ children }: { children: React.ReactNode }) => {
    return (
        <div className="sticky top-0 p-2 border-b">
            <div className="flex justify-end items-center">
                <div className="flex gap-2">
                    {children}
                </div>
            </div>
        </div>
    )
})

const SiglumDialogLeftContentBody = memo(({ children }: { children: React.ReactNode }) => {
    return (
        <div className="flex-1 overflow-y-auto">
            {children}
        </div>
    )
})

const SiglumDialogRightContent = memo(({ children }: { children: React.ReactNode }) => {
    return (
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
            {children}
        </div>
    )
})

/**
 * Siglum Setup Toolbar
 */
type SiglumSetupToolbarProps = {
    siglumList: Siglum[]
    onSelectSiglum: (siglum: Siglum) => void
    fontFamilyList: string[]
    fontFamilySymbols: CharacterSet
    onSelectFontFamilySymbolCode: (code: number) => void
    onSetFontFamily: (fontFamily: string) => void
    onSetSuperscript: () => void
    onSetSubscript: () => void
    onSetItalic: () => void
    onSetUnderline: () => void
    onSetBold: () => void
}

const SiglumSetupToolbar = forwardRef(({
    siglumList,
    onSelectSiglum,
    fontFamilyList,
    fontFamilySymbols,
    onSelectFontFamilySymbolCode,
    onSetFontFamily,
    onSetSuperscript,
    onSetSubscript,
    onSetItalic,
    onSetUnderline,
    onSetBold
}: SiglumSetupToolbarProps, ref: ForwardedRef<unknown>) => {
    const [emphasisState, setEmphasisState] = useState<EmphasisState | null>(null)

    useImperativeHandle(ref, () => ({
        setEmphasisState: (emphasisState: EmphasisState) => setEmphasisState(emphasisState)
    }))

    return (
        <SiglumSetupToolbarLayout>
            <div className="flex gap-2 items-center">
                <div className={`flex items-center space-x-2 transition-transform duration-300`}>
                    <Select
                        value={emphasisState?.fontFamily || "Times New Roman"}
                        onValueChange={(value) => {
                            onSetFontFamily(value)
                        }}
                    >
                        <SelectTrigger className="w-auto shadow-none focus:ring-0 focus:ring-offset-0 font-[400] text-[14px] border-none px-1">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {fontFamilyList.map((ff) => (
                                <SelectItem
                                    key={ff}
                                    value={ff}
                                    style={{ fontFamily: ff }}
                                >
                                    {ff}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <Divider className="px-0" />
                <Button
                    intent="secondary"
                    variant={emphasisState?.superscript ? "tonal" : "icon"}
                    size="iconSm"
                    tabIndex={10}
                    icon={<Superscript intent='secondary' variant='tonal' size='small' />}
                    onClick={() => {
                        onSetSuperscript()
                    }}
                    aria-pressed={false}
                    aria-label="superscript"
                    className="border-none shadow-none hover:bg-grey-80 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <Button
                    intent="secondary"
                    variant={emphasisState?.subscript ? "tonal" : "icon"}
                    size="iconSm"
                    tabIndex={10}
                    icon={<Subscript intent='secondary' variant='tonal' size='small' />}
                    onClick={() => {
                        onSetSubscript()
                    }}
                    aria-pressed={false}
                    aria-label="subscript"
                    className="border-none shadow-none hover:bg-grey-80 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <Button
                    intent="secondary"
                    variant={emphasisState?.bold ? "tonal" : "icon"}
                    size="iconSm"
                    tabIndex={10}
                    icon={<Bold intent='secondary' variant='tonal' size='small' />}
                    onClick={() => {
                        onSetBold()
                    }}
                    aria-pressed={false}
                    aria-label="bold"
                    className="border-none shadow-none hover:bg-grey-80 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <Button
                    intent="secondary"
                    variant={emphasisState?.italic ? "tonal" : "icon"}
                    size="iconSm"
                    tabIndex={10}
                    icon={<Italic intent='secondary' variant='tonal' size='small' />}
                    onClick={() => {
                        onSetItalic()
                    }}
                    aria-pressed={false}
                    aria-label="italic"
                    className="border-none shadow-none hover:bg-grey-80 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <Button
                    intent="secondary"
                    variant={emphasisState?.underline ? "tonal" : "icon"}
                    size="iconSm"
                    tabIndex={10}
                    icon={<Underline intent='secondary' variant='tonal' size='small' />}
                    onClick={() => {
                        onSetUnderline()
                    }}
                    aria-pressed={false}
                    aria-label="underline"
                    className="border-none shadow-none hover:bg-grey-80 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <Divider className="px-0" />
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            intent="secondary"
                            variant={"icon"}
                            size="iconSm"
                            icon={<Beta intent='secondary'
                                variant='tonal'
                                size='small'
                                disabled={fontFamilySymbols.length === 0}
                            />}
                            disabled={fontFamilySymbols.length === 0}
                        />
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                        <div className="flex flex-wrap overflow-auto ">
                            {fontFamilySymbols.map(({ code, name }) => (
                                <Button
                                    key={`${code}-${name}`}
                                    intent={"secondary"}
                                    variant={"border"}
                                    className="h-[40px] w-[40px] px-[15px] shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none"
                                    onClick={() => {
                                        onSelectFontFamilySymbolCode(code)
                                    }}
                                >
                                    {String.fromCharCode(code)}
                                </Button>
                            ))}
                        </div>
                    </PopoverContent>
                </Popover>
                <Divider className="px-0" />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            intent="secondary"
                            variant={"icon"}
                            size="iconSm"
                            icon={
                                <Siglum
                                    intent='secondary'
                                    variant='tonal'
                                    size='small'
                                    disabled={siglumList.length === 0}
                                />}
                            disabled={siglumList.length === 0}
                        />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-40">
                        {siglumList.map((item) => (
                            <DropdownMenuItem
                                key={item.id}
                                onClick={() => {
                                    onSelectSiglum(item)
                                }}>
                                {item.siglum.value}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </SiglumSetupToolbarLayout>
    )
})

type SiglumSetupEditorContainerProps = {
    onUpdateEmphasisState: (emphasisState: EmphasisState | undefined) => void
    onUpdateSiglumData: (id: string | null, title: SiglumData, manuscripts: SiglumData, description: SiglumData) => void
    errorDataTitle: string | null
}
const SiglumSetupEditorContainer = forwardRef(({
    onUpdateEmphasisState,
    onUpdateSiglumData,
    errorDataTitle
}: SiglumSetupEditorContainerProps,
    ref: ForwardedRef<unknown>) => {

    const { t } = useTranslation()

    const siglumRef = useRef<Siglum | null>(null)

    const [currentEditorRef, setCurrentEditorRef] = useState<HTMLRichTextEditorElement | null>(null)

    const titleEditorRef = useRef<HTMLRichTextEditorElement>(null)
    const manuscriptsEditorRef = useRef<HTMLRichTextEditorElement>(null)
    const descriptionEditorRef = useRef<HTMLRichTextEditorElement>(null)

    const handleUpdateContent = useCallback(() => {

        const title: SiglumData = {
            value: titleEditorRef.current?.getText() || "",
            content: titleEditorRef.current?.getHTML() || ""
        }

        const manuscripts: SiglumData = {
            value: manuscriptsEditorRef.current?.getText() || "",
            content: manuscriptsEditorRef.current?.getHTML() || ""
        }

        const description: SiglumData = {
            value: descriptionEditorRef.current?.getText() || "",
            content: descriptionEditorRef.current?.getHTML() || ""
        }

        onUpdateSiglumData(
            siglumRef.current?.id ?? null,
            title,
            manuscripts,
            description
        )
    }, [siglumRef.current])

    useImperativeHandle(ref, () => ({
        setSiglum: (item: Siglum | null) => {
            siglumRef.current = item
            titleEditorRef.current?.setContent(item?.siglum.content)
            manuscriptsEditorRef.current?.setContent(item?.manuscripts.content)
            descriptionEditorRef.current?.setContent(item?.description.content)
            handleUpdateContent()
        },
        addSiglum: (item: Siglum) => {
            titleEditorRef.current?.insertContent(item?.siglum.content)
            manuscriptsEditorRef.current?.insertContent(item?.manuscripts.content)
            descriptionEditorRef.current?.insertContent(item?.description.content)
        },
        setFontFamily: (fontFamily: string) => {
            currentEditorRef?.setFontFamily(fontFamily)
        },
        setSuperscript: () => {
            currentEditorRef?.setSuperscript()
        },
        setSubscript: () => {
            currentEditorRef?.setSubscript()
        },
        setBold: () => {
            currentEditorRef?.setBold()
        },
        setItalic: () => {
            currentEditorRef?.setItalic()
        },
        setUnderline: () => {
            currentEditorRef?.setUnderline()
        },
        insertCharacter: (character: number) => {
            currentEditorRef?.insertCharacter(character)
        }
    }))

    return (
        <>
            <div className="flex flex-col gap-2">
                <RichTextEditor
                    ref={titleEditorRef}
                    className="p-2 rounded-sm border-2"
                    extensions={oneLinerExtensionsConfig}
                    characterCountLimit={30}
                    content={siglumRef.current?.siglum.content}
                    onFocus={() => {
                        setCurrentEditorRef(titleEditorRef.current)
                    }}
                    onSelectionUpdate={() => {
                        const emphasisState = titleEditorRef.current?.getEmphasisState()
                        onUpdateEmphasisState(emphasisState)
                    }}
                    onUpdate={() => {
                        const emphasisState = titleEditorRef.current?.getEmphasisState()
                        onUpdateEmphasisState(emphasisState)
                        handleUpdateContent()
                    }}
                />
                {errorDataTitle && <p className="text-red-500 text-xs">{errorDataTitle}</p>}
            </div>
            <div className="flex flex-col gap-2 h-32">
                <Label className="text-xs font-bold ml-2">
                    {t("siglum.manuscripts", "##Manuscripts*##")}
                </Label>
                <RichTextEditor
                    ref={manuscriptsEditorRef}
                    className="p-2 rounded-sm border-2 h-full"
                    characterCountLimit={5000}
                    content={siglumRef.current?.manuscripts.content}
                    onFocus={() => {
                        setCurrentEditorRef(manuscriptsEditorRef.current)
                    }}
                    onSelectionUpdate={() => {
                        const emphasisState = manuscriptsEditorRef.current?.getEmphasisState()
                        onUpdateEmphasisState(emphasisState)
                    }}
                    onUpdate={() => {
                        const emphasisState = manuscriptsEditorRef.current?.getEmphasisState()
                        onUpdateEmphasisState(emphasisState)
                        handleUpdateContent()
                    }}
                />
            </div>
            <div className="flex flex-col gap-2 h-32">
                <Label className="text-xs font-bold ml-2">
                    {t("siglum.description", "##Description##")}
                </Label>
                <RichTextEditor
                    ref={descriptionEditorRef}
                    className="p-2 rounded-sm border-2 h-full"
                    characterCountLimit={10000}
                    content={siglumRef.current?.description.content}
                    onFocus={() => {
                        setCurrentEditorRef(descriptionEditorRef.current)
                    }}
                    onCreate={() => {
                        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
                        (async () => {
                            await delay(100);
                            titleEditorRef.current?.setFocus()
                        })();
                    }}
                    onSelectionUpdate={() => {
                        const emphasisState = descriptionEditorRef.current?.getEmphasisState()
                        onUpdateEmphasisState(emphasisState)
                    }}
                    onUpdate={() => {
                        const emphasisState = descriptionEditorRef.current?.getEmphasisState()
                        onUpdateEmphasisState(emphasisState)
                        handleUpdateContent()
                    }}
                />
            </div>
        </>
    )
})

/**
 * Memoize the ToolbarLayout to prevent re-rendering when the children props change
 */
const SiglumSetupToolbarLayout = memo(({ children }: { children: React.ReactNode }) => {
    return (
        <div className="flex gap-2 items-center justify-between  border-b border-grey-80 pb-2">
            <div className="flex gap-2 items-center">
                {children}
            </div>
        </div>
    )
})
