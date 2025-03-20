import TextStyle from '@tiptap/extension-text-style'
import { Extension, Mark, mergeAttributes } from "@tiptap/core";

const CustomTextStyle = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: element => element.style.fontSize,
        renderHTML: attributes => {
          if (!attributes.fontSize) {
            return {}
          }
          return {
            style: `font-size: ${attributes.fontSize}`
          }
        }
      }
    }
  }
})

const CustomLetterSpacing = Mark.create({
  name: "letterSpacing",

  addAttributes() {
    return {
      ...this.parent?.(),
      spacing: {
        default: "normal",
        parseHTML: (element) => element.style.letterSpacing || "normal",
        renderHTML: (attributes) => {
          if (!attributes.spacing || attributes.spacing === "normal") {
            return {};
          }
          return { style: `letter-spacing: ${attributes.spacing}` };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[style]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes), 0];
  },
});

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    capitalization: {
      setCapitalization: (style: string, originalText?: string) => ReturnType;
    }
  }
}

const Capitalization = Mark.create({
  name: 'capitalization',
  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },
  addAttributes() {
    return {
      style: {
        default: 'none',
        parseHTML: element => element.getAttribute('data-capitalization'),
        renderHTML: attributes => {
          if (!attributes.style || attributes.style === 'none') return {};
          return { 'data-capitalization': attributes.style };
        }
      },
      originalText: {
        default: null,
        parseHTML: element => element.getAttribute('data-original'),
        renderHTML: attributes => {
          if (!attributes.originalText) return {};
          return { 'data-original': attributes.originalText };
        }
      }
    };
  },
  parseHTML() {
    return [{ tag: 'span[data-capitalization]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0];
  },
  addCommands() {
    return {
      setCapitalization: (style, originalText) => ({ chain, editor }) => {
        const { from, to } = editor.state.selection;
        const selectedText = editor.state.doc.textBetween(from, to, ' ');

        return chain()
          .setMark(this.name, {
            style,
            originalText: originalText || selectedText // Store original text automatically
          })
          .run();
      }
    };
  }
});


interface IndentOptions {
  maxIndent: number;
  indentStep: number;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    indent: {
      increaseIndent: () => ReturnType;
      decreaseIndent: () => ReturnType;
    };
  }
}

const IndentExtension = Extension.create<IndentOptions>({
  name: 'indent',

  addOptions() {
    return {
      maxIndent: 4,
      indentStep: 40,
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading'],
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) => parseInt(element.getAttribute('data-indent') || '0', 10),
            renderHTML: (attributes) => ({ 'data-indent': attributes.indent }),
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      increaseIndent:
        () =>
          ({ commands }) => {
            const indent = this.editor.getAttributes('paragraph').indent || 0;
            return commands.updateAttributes('paragraph', {
              indent: Math.min(indent + 1, this.options.maxIndent),
            });
          },
      decreaseIndent:
        () =>
          ({ commands }) => {
            const indent = this.editor.getAttributes('paragraph').indent || 0;
            return commands.updateAttributes('paragraph', {
              indent: Math.max(indent - 1, 0),
            });
          },
    };
  },
});


declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    lineSpacing: {
      setLineHeight: (lineHeight: string) => ReturnType;
      resetLineHeight: () => ReturnType;
    };
  }
}

const LineSpacing = Extension.create({
  name: 'lineSpacing',
  addOptions() {
    return {
      types: ['paragraph', 'heading'],
      lineHeights: ['1', '1.5', '2', '2.5', '3'],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element) => element.style.lineHeight?.replace(/['"]+/g, ''),
            renderHTML: (attributes) => ({
              style: attributes.lineHeight ? `line-height: ${attributes.lineHeight}` : '',
            }),
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setLineHeight:
        (lineHeight: string) =>
          ({ commands }) => {
            return this.options.types.every((type: string) =>
              commands.updateAttributes(type, { lineHeight }),
            );
          },
      resetLineHeight:
        () =>
          ({ commands }) => {
            return this.options.types.every((type: string) =>
              commands.resetAttributes(type, 'lineHeight'),
            );
          },
    };
  },
});

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    paragraphSpacing: {
      setSpacingBefore: (spacing: string) => ReturnType;
      setSpacingAfter: (spacing: string) => ReturnType;
      resetSpacing: () => ReturnType;
    };
  }
}

const ParagraphSpacing = Extension.create({
  name: 'paragraphSpacing',
  addOptions() {
    return {
      types: ['paragraph', 'heading'],
      units: ['pt', 'px', 'em'],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          spacingBefore: {
            default: null,
            parseHTML: (element) => element.style.marginTop?.replace(/['"]+/g, ''),
            renderHTML: (attributes) => ({
              style: attributes.spacingBefore ? `margin-top: ${attributes.spacingBefore}` : '',
            }),
          },
          spacingAfter: {
            default: null,
            parseHTML: (element) => element.style.marginBottom?.replace(/['"]+/g, ''),
            renderHTML: (attributes) => ({
              style: attributes.spacingAfter ? `margin-bottom: ${attributes.spacingAfter}` : '',
            }),
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setSpacingBefore:
        (spacing: string) =>
          ({ commands }) => {
            return this.options.types.every((type: string) =>
              commands.updateAttributes(type, { spacingBefore: spacing }),
            );
          },
      setSpacingAfter:
        (spacing: string) =>
          ({ commands }) => {
            return this.options.types.every((type: string) =>
              commands.updateAttributes(type, { spacingAfter: spacing }),
            );
          },
      resetSpacing:
        () =>
          ({ commands }) => {
            return this.options.types.every((type: string) => {
              return (
                commands.resetAttributes(type, 'spacingBefore') &&
                commands.resetAttributes(type, 'spacingAfter')
              );
            });
          },
    };
  },
});


declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    ligature: {
      setLigature: (type: LigatureType) => ReturnType;
      unsetLigature: () => ReturnType;
    };
  }
}
const Ligature = Mark.create({
  name: 'ligature',
  addOptions() {
    return {
      HTMLAttributes: {},
      ligatureTypes: {
        standard: 'common-ligatures',
        all: 'common-ligatures discretionary-ligatures historical-ligatures',
        none: 'none'
      }
    };
  },
  addAttributes() {
    return {
      type: {
        default: 'standard',
        parseHTML: element => {
          const styles = element.getAttribute('style') || '';
          if (styles.includes('common-ligatures') && !styles.includes('discretionary-ligatures')) {
            return 'standard';
          }
          if (styles.includes('discretionary-ligatures')) {
            return 'all';
          }
          if (styles.includes('none')) {
            return 'none';
          }
          return null;
        },
      },
    };
  },
  parseHTML() {
    return [{
      tag: 'span[style*="ligatures"]',
    }];
  },
  renderHTML({ HTMLAttributes }) {
    const type = HTMLAttributes.type || 'standard';
    return ['span',
      {
        ...HTMLAttributes,
        style: `font-variant-ligatures: ${this.options.ligatureTypes[type]};`,
        class: `ligature-${type}`,
      },
      0
    ];
  },
  addCommands() {
    return {
      setLigature: (type: LigatureType) => ({ commands }) => {
        return commands.setMark(this.name, { type });
      },
      unsetLigature: () => ({ commands }) => {
        return commands.unsetMark(this.name);
      },
    };
  },
});

export { CustomTextStyle, CustomLetterSpacing, Capitalization, IndentExtension, LineSpacing, ParagraphSpacing, Ligature }