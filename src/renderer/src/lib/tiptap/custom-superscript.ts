import Superscript from "@tiptap/extension-superscript";

const CustomSuperscript = Superscript.extend({
  addKeyboardShortcuts() {
    return {
      // Return an empty object or omit the default shortcut
    }
  },
});

export default CustomSuperscript;