import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import FontFamily from '@tiptap/extension-font-family';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import CodeBlock from '@tiptap/extension-code-block';
// import { History } from '@tiptap/extension-history';
import { Color } from '@tiptap/extension-color';
import { CustomTextStyle, CustomLetterSpacing, IndentExtension, Capitalization, ParagraphSpacing, LineSpacing, Ligature } from './customTextStyle';
import { useEditor } from '@tiptap/react';



const defaultEditorConfig: Parameters<typeof useEditor>[0] = {
    extensions: [
        // History.configure({
        //     depth: 100,
        //     newGroupDelay: 500,
        // }),
        IndentExtension,
        StarterKit.configure({
            heading: {
                levels: [1, 2, 3, 4, 5, 6]
            },
            codeBlock: false,
            history: {
                depth: 100,
                newGroupDelay: 500
            }
        }),
        TextAlign.configure({
            types: ['heading', 'paragraph'],
        }),
        FontFamily.configure({
            types: ['textStyle'],
        }),
        CustomTextStyle,
        CustomLetterSpacing,
        Capitalization,
        ParagraphSpacing,
        LineSpacing,
        Underline,
        CodeBlock,
        Highlight.configure({ multicolor: true }),
        Color,
        Ligature.configure({
            ligatureTypes: {
                standard: 'common-ligatures',
                all: 'common-ligatures discretionary-ligatures historical-ligatures',
                none: 'none'
            }
        }),
    ]
}

export { defaultEditorConfig }