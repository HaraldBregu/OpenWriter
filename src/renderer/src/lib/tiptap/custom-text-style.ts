import TextStyle from '@tiptap/extension-text-style'
import { Mark, mergeAttributes } from "@tiptap/core";

const CustomTextStyle = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: '12pt',
        parseHTML: element => element.style.fontSize,
        renderHTML: attributes => {
          if (!attributes.fontSize) {
            return {}
          }
          return {
            style: `font-size: ${attributes.fontSize}`
          }
        }
      },
      fontFamily: {
        default: 'Times New Roman',
        parseHTML: (element) => element.style.fontFamily ?? null,
        renderHTML: (attributes) => {
          if (!attributes.fontFamily) {
            return {};
          }
          return {
            style: `font-family: ${attributes.fontFamily}`,
          };
        },
      },
      color: {
        default: 'black',
        parseHTML: (element) => element.style.color ?? null,
        renderHTML: (attributes) => {
          if (!attributes.color) {
            return {};
          }
          return {
            style: `color: ${attributes.color}`,
          };
        },
      },
      fontVariant: {
        default: null,
        parseHTML: (element) => element.style.fontVariant ?? null,
        renderHTML: (attributes) => {
          if (!attributes.fontVariant) {
            return {};
          }
          return {
            style: `font-variant: ${attributes.fontVariant}`
          };
        }
      },
      zoom: {
        default: null,
        parseHTML: (element) => element.style.zoom ?? null,
        renderHTML: (attributes) => {
          if (!attributes.zoom) {
            return {};
          }
          return {
            style: `zoom: ${attributes.zoom}`
          };
        }
      },
    }
  },
});

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

export { CustomTextStyle, CustomLetterSpacing }