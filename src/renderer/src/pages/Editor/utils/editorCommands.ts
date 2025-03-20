import { Editor } from "@tiptap/react";

export function toggleBold(editor: Editor | null) {
    if (!editor) return;
    try {
        editor.chain().focus().toggleBold().run();
    } catch (error) {
        console.error("Errore in toggleBold:", error);
    }
}

export function toggleItalic(editor: Editor | null) {
    if (!editor) return;
    try {
        editor.chain().focus().toggleItalic().run();
    } catch (error) {
        console.error("Errore in toggleItalic:", error);
    }
}

export function toggleUnderline(editor: Editor | null) {
    if (!editor) return;
    try {
        editor.chain().focus().toggleUnderline().run();
    } catch (error) {
        console.error("Errore in toggleUnderline:", error);
    }
}

export function toggleStrike(editor: Editor | null) {
    if (!editor) return;
    try {
        editor.chain().focus().toggleStrike().run();
    } catch (error) {
        console.error("Errore in toggleStrike:", error);
    }
}

export function toggleBulletList(editor: Editor | null) {
    if (!editor) return;
    try {
        editor.chain().focus().toggleBulletList().run();
    } catch (error) {
        console.error("Errore in toggleBulletList:", error);
    }
}

export function toggleOrderedList(editor: Editor | null) {
    if (!editor) return;
    try {
        editor.chain().focus().toggleOrderedList().run();
    } catch (error) {
        console.error("Errore in toggleOrderedList:", error);
    }
}

export function setTextAlign(editor: Editor | null, alignment: string) {
    if (!editor) return;
    if (!["left", "center", "right", "justify"].includes(alignment)) {
        console.warn(`Allineamento non valido: "${alignment}"`);
        return;
    }
    try {
        editor.chain().focus().setTextAlign(alignment).run();
    } catch (error) {
        console.error("Errore in setTextAlign:", error);
    }
}

export function setFontFamily(editor: Editor | null, fontFamily: string) {
    if (!editor) return;
    try {
        editor.chain().focus().setFontFamily(fontFamily).run();
    } catch (error) {
        console.error("Errore in setFontFamily:", error);
    }
}

export function setFontSize(editor: Editor | null, fontSize: string) {
    if (!editor) return;
    try {
        editor.chain().focus().setMark("textStyle", { fontSize }).run();
    } catch (error) {
        console.error("Errore in setFontSize:", error);
    }
}

export function unsetMark(editor: Editor | null, mark: string) {
    if (!editor) return;
    try {
        editor.chain().focus().unsetMark(mark).run();
    } catch (error) {
        console.error(`Errore in unsetMark per ${mark}:`, error);
    }
}
