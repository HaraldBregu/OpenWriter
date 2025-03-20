import { Editor } from "@tiptap/react";
import { Mark as ProseMark, Node as ProseNode } from "prosemirror-model";
import { toTitleCasePreserve } from "./titleCaseUtil";

export type CapitalizationType = "allCaps" | "smallCaps" | "startCase" | "none" | "titleCase";
export type CharacterSpacingType = "tighten" | "loosen" | "normal";

export function adjustCapitalization(editor: Editor | null, type: CapitalizationType): void {
    if (!editor) return;
    if (type === "titleCase") {
        const { from, to } = editor.state.selection;
        const selectedText = editor.state.doc.textBetween(from, to, " ");
        const existingMark = editor.getAttributes("capitalization");
        const originalText = existingMark.originalText || selectedText;
        const transformed = toTitleCasePreserve(selectedText);
        const existingMarks: ProseMark[] = [];
        editor.state.doc.nodesBetween(from, to, (node: ProseNode) => {
            if (node.isText) {
                node.marks.forEach((mark) => {
                    if (mark.type.name !== "capitalization") {
                        existingMarks.push(mark);
                    }
                });
            }
            return true;
        });
        const uniqueMarks = existingMarks.reduce<ProseMark[]>((acc, mark) => {
            if (!acc.some(m => m.type === mark.type)) {
                acc.push(mark);
            }
            return acc;
        }, []);
        const marks = uniqueMarks.map(mark => ({
            type: mark.type.name,
            attrs: mark.attrs,
        }));
        marks.push({
            type: "capitalization",
            attrs: {
                style: "title-case",
                originalText: originalText
            },
        });
        editor.chain()
            .focus()
            .insertContentAt({ from, to }, {
                type: "text",
                text: transformed,
                marks: marks,
            })
            .run();
    } else if (type === "none") {
        const { state, view } = editor;
        const { doc, tr } = state;
        const { from, to } = state.selection;
        const replacements: Array<{ pos: number; original: string; node: ProseNode }> = [];
        doc.nodesBetween(from, to, (node: ProseNode, pos: number) => {
            if (!node.isText) return true;
            const mark = node.marks.find((m: ProseMark) => m.type.name === "capitalization");
            if (!mark?.attrs.originalText) return true;
            replacements.push({ pos, original: mark.attrs.originalText, node });
            return true;
        });
        replacements.reverse().forEach(({ pos, original, node }) => {
            const start = pos;
            const end = pos + node.nodeSize;
            tr.replaceWith(
                start,
                end,
                state.schema.text(
                    original,
                    node.marks.filter((m: ProseMark) => m.type.name !== "capitalization")
                )
            );
        });
        const map = tr.mapping.maps[tr.steps.length - 1];
        const newFrom = map ? map.map(from) : from;
        const newTo = map ? map.map(to) : to;
        tr.removeMark(newFrom, newTo, state.schema.marks.capitalization);
        view.dispatch(tr);
    } else {
        const transformMap: Record<CapitalizationType, string> = {
            allCaps: "uppercase",
            smallCaps: "small-caps",
            startCase: "capitalize",
            titleCase: "title-case",
            none: "none"
        };
        editor.chain()
            .focus()
            .setMark("capitalization", { style: transformMap[type] })
            .run();
    }
}

export function adjustLetterSpacing(editor: Editor | null, type: CharacterSpacingType): void {
    if (!editor) return;
    let spacingValue: string;
    switch (type) {
        case "tighten":
            spacingValue = "-0.05em";
            break;
        case "loosen":
            spacingValue = "0.2em";
            break;
        case "normal":
        default:
            spacingValue = "normal";
    }
    editor.chain().focus().setMark("letterSpacing", { spacing: spacingValue }).run();
}
