import Subscript from "@tiptap/extension-subscript";

const CustomSubscript = Subscript.extend({
  addKeyboardShortcuts() {
    return {
      // Return an empty object or omit the default shortcut
    }
  },
});

export default CustomSubscript;