import Underline from "@tiptap/extension-underline"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Text from '@tiptap/extension-text'
import { ForwardedRef, forwardRef, HTMLAttributes, useCallback, useImperativeHandle } from "react"
import Superscript from "@tiptap/extension-superscript"
import Subscript from "@tiptap/extension-subscript"
import cn from "@/utils/classNames"
import OneLiner from "../nodes/one-liner-node"
import { ExtendedParagraph } from "../extensions/paragraph-extension"
import CharacterCount from "@tiptap/extension-character-count"
import { defaultExtensionsConfig } from "./constants"
import FontFamily from "@tiptap/extension-font-family"
import TextStyle from "@tiptap/extension-text-style"


export type HTMLRichTextEditorElement = {
    setFontFamily: (fontFamily: string) => void;
    setBold: () => void;
    setItalic: () => void;
    setUnderline: () => void;
    setSuperscript: () => void;
    setSubscript: () => void;
    getHTML: () => string;
    getText: () => string;
    getCharacters: () => number;
    getWords: () => number;
    setFocus: () => void;
    getEmphasisState: () => EmphasisState;
    setContent: (content: string | null | undefined) => void;
    insertContent: (content: string) => void;
    insertCharacter: (character: number) => void;
}

type RichTextEditorProps = {
    className?: string;
    props?: HTMLAttributes<HTMLDivElement>;
    extensions?: RichTextEditorExtension[];
    characterCountLimit?: number;
    content?: string;
    defaultFontFamily?: string;
    onCreate?: () => void;
    onUpdate?: () => void;
    onFocus?: () => void;
    onBlur?: () => void;
    onSelectionUpdate?: () => void;
}

const RichTextEditor = forwardRef(({
    className,
    props,
    extensions = defaultExtensionsConfig,
    characterCountLimit = Number.MAX_SAFE_INTEGER,
    content,
    defaultFontFamily = "Times New Roman",
    onCreate,
    onFocus,
    onBlur,
    onUpdate,
    onSelectionUpdate,
}: RichTextEditorProps,
    ref: ForwardedRef<HTMLRichTextEditorElement>) => {

    const editor = useEditor({
        extensions: [
            ...extensions?.map((extension: RichTextEditorExtension) => {
                switch (extension) {
                    case "ONE_LINER":
                        return OneLiner
                    case "CHARACTER_COUNT":
                        return CharacterCount.configure({
                            limit: characterCountLimit,
                        })
                    case "EXTENDED_PARAGRAPH":
                        return ExtendedParagraph
                    case "TEXT":
                        return Text
                    case "TEXT_STYLE":
                        return TextStyle
                    case "UNDERLINE":
                        return Underline
                    case "SUPERSCRIPT":
                        return Superscript
                    case "SUBSCRIPT":
                        return Subscript
                    case "STARTER_KIT":
                        return StarterKit.configure({})
                    case "FONT_FAMILY":
                        return FontFamily.configure()
                }
            }) ?? []
        ],
        content: content,
        onCreate: onCreate,
        onFocus: onFocus,
        onBlur: onBlur,
        onUpdate: onUpdate,
        onSelectionUpdate: onSelectionUpdate
    })

    if (!editor)
        throw new Error("Editor not initialized")

    const handleEmphasisState = useCallback(() => {
        const emphasisState: EmphasisState = {
            bold: editor.isActive("bold"),
            italic: editor.isActive("italic"),
            underline: editor.isActive("underline"),
            superscript: editor.isActive("superscript"),
            subscript: editor.isActive("subscript"),
            strikethrough: editor.isActive("strikethrough"),
            alignment: editor.isActive("alignLeft") ? "left" : editor.isActive("alignCenter") ? "center" : editor.isActive("alignRight") ? "right" : "justify",
            blockquote: editor.isActive("blockquote"),
            isCodeBlock: editor.isActive("codeBlock"),
            bulletStyle: {
                type: editor.isActive("bulletedList") ? "BULLET" : editor.isActive("orderedList") ? "ORDER" : "",
                style: editor.isActive("orderedList") ? "decimal" : editor.isActive("bulletedList") ? "disc" : "",
                previousType: ""
            },
            highlight: editor.isActive("highlight") ? editor.getAttributes("highlight").color : "",
            textColor: editor.isActive("textColor") ? editor.getAttributes("textColor").color : "",
            spacing: {
                before: editor.getAttributes("paragraph").marginTop,
                after: editor.getAttributes("paragraph").marginBottom,
                line: editor.getAttributes("paragraph").lineHeight
            },
            showNonPrintingCharacters: editor.isActive("nonPrintingCharacter"),
            headingLevel: editor.isActive("heading") ? editor.getAttributes("heading").level : 0,
            fontFamily: editor.getAttributes("textStyle").fontFamily || defaultFontFamily,
            fontSize: editor.getAttributes("textStyle").fontSize,
        }
        return emphasisState
    }, [editor])

    useImperativeHandle(ref, () => ({
        setFontFamily: (fontFamily: string) => {
            editor?.chain().focus()
                .setFontFamily(fontFamily)
                .run();
        },
        setBold: () => {
            editor?.chain().focus().toggleBold().run()
        },
        setItalic: () => {
            editor?.chain().focus().toggleItalic().run()
        },
        setUnderline: () => {
            editor?.chain().focus().toggleUnderline().run()
        },
        setSuperscript: () => {
            editor?.chain().focus().toggleSuperscript().run()
        },
        setSubscript: () => {
            editor?.chain().focus().toggleSubscript().run()
        },
        getHTML: () => {
            return editor?.getHTML() || ""
        },
        getText: () => {
            return editor?.getText() || ""
        },
        getCharacters: () => {
            return editor.storage.characterCount.characters()
        },
        getWords: () => {
            return editor.storage.characterCount.words()
        },
        setFocus: () => {
            editor.view.dom.focus()
        },
        setContent: (content: string | null | undefined) => {
            editor.commands.setContent(content ?? "")
        },
        insertContent: (content: string) => {
            editor.commands.insertContent(content)
        },
        insertCharacter: (character: number) => {
            editor.chain().focus().insertContent(String.fromCharCode(character)).run();
        },
        getEmphasisState: handleEmphasisState
    }))

    return (
        <EditorContent
            editor={editor}
            className={cn(className, "!bg-white h-full !p-0 !m-0 rounded-sm")}
            {...props}
        />
    )
})

export default RichTextEditor