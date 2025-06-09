import { Extension } from "@tiptap/core";

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    lineSpacing: {
      setLineSpacing: (lineHeight: Spacing) => ReturnType;
      resetLineSpacing: () => ReturnType;
    };
  }
}

const LineSpacing = Extension.create({
  name: 'lineSpacing',
  addOptions() {
    return {
      types: ['paragraph', 'heading'],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: 1,
            parseHTML: (element) => element.style.lineHeight?.replace(/['"]+/g, ''),
            renderHTML: (attributes) => ({
              style: attributes.lineHeight ? `line-height: ${attributes.lineHeight}` : '',
            }),
          },
          marginTop: {
            default: 10,
            parseHTML: (element) => element.style.marginTop?.replace(/['"]+/g, ''),
            renderHTML: (attributes) => {
              return {
              style: Number.isSafeInteger(attributes.marginTop) ? `margin-top: ${attributes.marginTop}px` : '',
            }
          },
          },
          marginBottom: {
            default: 10,
            parseHTML: (element) => element.style.marginBottom?.replace(/['"]+/g, ''),
            renderHTML: (attributes) => ({
              style: Number.isSafeInteger(attributes.marginBottom) ? `margin-bottom: ${attributes.marginBottom}px` : '',
            }),
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setLineSpacing:
        (lineSpacing: Spacing) =>
          ({ commands }) => {
            return this.options.types.every((type: string) =>
              commands.updateAttributes(type, { lineHeight: lineSpacing.line, marginTop: lineSpacing.before, marginBottom: lineSpacing.after }),
            );
          },
      resetLineSpacing:
        () =>
          ({ commands }) => {
            return this.options.types.every((type: string) =>
              commands.resetAttributes(type, ['lineHeight', 'marginTop', 'marginBottom']),
            );
          },
    };
  },
  addKeyboardShortcuts() {
    return {
      'Mod+1': () => this.editor.commands.setLineSpacing({
        line: 1,
        before: null,
        after: null,
      }),
      'Mod+2': () => this.editor.commands.setLineSpacing({
        line: 1.15,
        before: null,
        after: null,
      }),
      'Mod+3': () => this.editor.commands.setLineSpacing({
        line: 1.5,
        before: null,
        after: null,
      }),
      'Mod+4': () => this.editor.commands.setLineSpacing({
        line: 2,
        before: null,
        after: null,
      }),
    };
  },
});

export default LineSpacing;