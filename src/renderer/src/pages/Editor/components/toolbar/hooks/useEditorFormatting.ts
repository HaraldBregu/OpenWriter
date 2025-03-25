import { useState, useCallback, useEffect } from "react";
import { Editor } from "@tiptap/react";

interface FormattingState {
    bold: boolean;
    italic: boolean;
    underline: boolean;
    strikethrough: boolean;
    alignment: string;
    fontSize: string;
    hasApparatusText: boolean;
    fontFamily: string;
    headingLevel: number;
    isBlockquote: boolean;
    isCodeBlock: boolean;
    isOrderedList: boolean;
    isBulletList: boolean;
    highlight: string;
    textColor: string;
}

const defaultFormatting: FormattingState = {
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    alignment: "left",
    hasApparatusText: false,
    fontSize: "12px",
    fontFamily: "Times New Roman",
    headingLevel: 0,
    isBlockquote: false,
    isCodeBlock: false,
    isOrderedList: false,
    isBulletList: false,
    highlight: "none",
    textColor: "black",
};

export default function useEditorFormatting(activeEditor: Editor | null) {
    const [formatting, setFormatting] = useState<FormattingState>(defaultFormatting);

    const updateFormatting = useCallback(() => {
        if (!activeEditor) return;
        setFormatting((prevState) => {
            const newFormatting: FormattingState = {
                bold: activeEditor.isActive("bold"),
                italic: activeEditor.isActive("italic"),
                underline: activeEditor.isActive("underline"),
                strikethrough: activeEditor.isActive("strike"),
                hasApparatusText: activeEditor?.isActive('apparatusText') || false,
                alignment: activeEditor.getAttributes("paragraph")?.textAlign || "left",
                fontSize: activeEditor.getAttributes("textStyle")?.fontSize || "12px",
                fontFamily: activeEditor.getAttributes("textStyle")?.fontFamily || "Times New Roman",
                headingLevel: activeEditor.getAttributes("heading")?.level || 0,
                isBlockquote: activeEditor.isActive("blockquote"),
                isCodeBlock: activeEditor.isActive("codeBlock"),
                isOrderedList: activeEditor.isActive("orderedList"),
                isBulletList: activeEditor.isActive("bulletList"),
                highlight: activeEditor.getAttributes("highlight")?.color || "none",
                textColor: activeEditor.getAttributes("textStyle")?.color || "black",
            };
            return JSON.stringify(prevState) === JSON.stringify(newFormatting) ? prevState : newFormatting;
        });
    }, [activeEditor]);

    useEffect(() => {
        if (!activeEditor) return;
        updateFormatting();
        activeEditor.on("selectionUpdate", updateFormatting);
        activeEditor.on("transaction", updateFormatting);
        return () => {
            activeEditor.off("selectionUpdate", updateFormatting);
            activeEditor.off("transaction", updateFormatting);
        };
    }, [activeEditor, updateFormatting]);

    return { formatting, updateFormatting };
}
