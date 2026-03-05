// import { Extension } from '@tiptap/core'
// import { Plugin, PluginKey } from '@tiptap/pm/state'
// import { Decoration, DecorationSet } from '@tiptap/pm/view'

// const InlinePlaceholder = Extension.create({
//     name: 'inlinePlaceholder',

//     addOptions() {
//         return {
//             placeholder: 'Keep writing…',
//         }
//     },

//     addProseMirrorPlugins() {
//         const { placeholder } = this.options

//         return [
//             new Plugin({
//                 key: new PluginKey('inlinePlaceholder'),
//                 props: {
//                     decorations(state) {
//                         const { doc, selection } = state
//                         const { $cursor } = selection

//                         // Only show when there's a cursor (not a range selection)
//                         if (!$cursor) return DecorationSet.empty

//                         const isAtEnd = $cursor.pos === $cursor.end()

//                         if (!isAtEnd) return DecorationSet.empty

//                         // Create a widget decoration placed AFTER the cursor
//                         const widget = Decoration.widget(
//                             $cursor.pos,
//                             () => {
//                                 const span = document.createElement('span')
//                                 span.className = 'inline-placeholder'
//                                 span.textContent = placeholder
//                                 span.setAttribute('contenteditable', 'false')
//                                 return span
//                             },
//                             { side: 1 } // side: 1 places it AFTER the cursor
//                         )

//                         return DecorationSet.create(doc, [widget])
//                     },
//                 },
//             }),
//         ]
//     },
// })



// export { InlinePlaceholder }

// const editor = useEditor({
//   extensions: [
//     StarterKit,
//     InlinePlaceholder.configure({
//       placeholder: 'Keep writing…',
//     }),
//   ],
// })

// .inline-placeholder {
//   color: #aaa;
//   pointer-events: none;
//   user-select: none;
//   font-style: italic;
// }
// Key details:

// side: 1 — This is the critical option. It tells ProseMirror to render the widget after the cursor, not before it. Use side: -1 if you ever want it before.
// $cursor.pos === $cursor.end() — This checks that the cursor is at the very end of its parent node (e.g., a paragraph). You can relax this condition if you want the placeholder to show anywhere, not just at the end of a block.
// contenteditable="false" — Prevents the user from accidentally placing their cursor inside the decoration span.