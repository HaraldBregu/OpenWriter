import { Extension } from "@tiptap/core";

// TODO
export const TabKeyExtension = Extension.create({
    name: 'tabKeyHandler',

   // addProseMirrorPlugins() {
  //   return [
  //     new Plugin({
  //       key: new PluginKey('handleTabIndent'),
  //       props: {
  //         handleKeyDown: (_, event) => {
  //           if (event.key === 'Tab' && !event.ctrlKey && !event.metaKey) {
  //             if (this.editor.isActive('bulletedList') || this.editor.isActive('orderList')) {
  //               if (!event.shiftKey) {
  //                 event.preventDefault();
  //                 const { state } = this.editor;
  //                 const { selection } = state;
  //                 const { $from } = selection;

  //                 const isFirstListItem = () => {
  //                   const resolvedPos = state.doc.resolve($from.pos);
  //                   let depth = resolvedPos.depth;

  //                   while (depth > 0) {
  //                     const node = resolvedPos.node(depth);
  //                     if (node.type.name === 'listItem') {
  //                       const index = resolvedPos.index(depth);
  //                       return index === 0;
  //                     }
  //                     depth--;
  //                   }
  //                   return false;
  //                 };

  //                 if (isFirstListItem()) {
  //                   const listType = this.editor.isActive('bulletedList') ? 'bulletedList' : 'orderList';
  //                   const listIndent = this.editor.getAttributes(listType).indent || 0;
  //                   const maxIndent = Math.min(this.options.maxIndent, (this.editor.view.dom.offsetWidth / this.options.indentStep) - 2);
  //                   try {
  //                     const newIndent = Math.min(listIndent + 1, maxIndent);
  //                     const tr = this.editor.state.tr;
  //                     const selection = this.editor.state.selection;
  //                     let found = false;

  //                     this.editor.state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
  //                       if ((node.type.name === 'bulletedList' || node.type.name === 'orderList') && !found) {
  //                         found = true;
  //                         tr.setNodeMarkup(pos, null, {
  //                           ...node.attrs,
  //                           indent: newIndent
  //                         });
  //                         return false;
  //                       }
  //                       return true;
  //                     });

  //                     if (found) {
  //                       this.editor.view.dispatch(tr);
  //                       return true;
  //                     }

  //                     return this.editor.chain()
  //                       .focus()
  //                       .updateAttributes(listType, { indent: newIndent })
  //                       .run();
  //                   } catch (e) {
  //                     console.error('Error indenting list:', e);
  //                     // Fallback: usa il comportamento standard
  //                     return this.editor.chain().focus()
  //                       .splitListItem('listItem')
  //                       .sinkListItem('listItem')
  //                       .run();
  //                   }
  //                 } else {
  //                   // Comportamento normale per elementi successivi
  //                   return this.editor.chain()
  //                     .focus()
  //                     .splitListItem('listItem')
  //                     .sinkListItem('listItem')
  //                     .run();
  //                 }
  //               }
  //               // Shift+Tab gestito in addKeyboardShortcuts
  //               return false;
  //             }

  //             // Gestione per paragrafi normali
  //             if (this.editor.isActive('codeBlock'))
  //               return false;

  //             if (event.shiftKey) {
  //               event.preventDefault();
  //               const { selection, doc } = this.editor.state;
  //               const { from: initialFrom, to: initialTo } = selection;

  //               if (!selection.empty) {
  //                 const linesToOutdent: { start: number; canOutdent: boolean }[] = [];


  //                 doc.nodesBetween(initialFrom, initialTo, (node, pos) => {
  //                   if (node.type.name === 'paragraph' || node.type.name === 'heading') {
  //                     const content = node.content.toJSON() as any[];
  //                     if (content && Array.isArray(content)) {

  //                       let currentLineContentStart = pos + 1;


  //                       if (currentLineContentStart <= initialTo && (pos < initialTo && (pos + node.nodeSize) > initialFrom)) {
  //                         const charAtStart = doc.textBetween(currentLineContentStart, currentLineContentStart + 1, "", "");
  //                         const canOutdentThisLine = charAtStart === '\t';
  //                         if (!linesToOutdent.some(l => l.start === currentLineContentStart)) {
  //                           linesToOutdent.push({ start: currentLineContentStart, canOutdent: canOutdentThisLine });
  //                         }
  //                       }

  //                       // Find subsequent lines after hardBreaks using your existing iteration style

  //                       let scanPosWithinNodeContent = pos + 1;

  //                       for (let i = 0; i < content.length; i++) {
  //                         const item = content[i];
  //                         let itemLength = 0;

  //                         if (item.type === 'hardBreak') {
  //                           // The line after hardBreak starts immediately after the hardBreak character itself.
  //                           itemLength = 1;
  //                           currentLineContentStart = scanPosWithinNodeContent + itemLength;

  //                           // Check if this new line is relevant to the selection
  //                           if (currentLineContentStart >= initialFrom && currentLineContentStart <= initialTo) {
  //                             const charAtStartOfNewLine = doc.textBetween(currentLineContentStart, currentLineContentStart + 1, "", "");
  //                             const canOutdentNewLine = charAtStartOfNewLine === '\t';
  //                             if (!linesToOutdent.some(l => l.start === currentLineContentStart)) {
  //                               linesToOutdent.push({ start: currentLineContentStart, canOutdent: canOutdentNewLine });
  //                             }
  //                           }
  //                         } else if (item.type === 'text' && item.text) {
  //                           itemLength = item.text.length;
  //                         } else {
  //                           // Fallback for other inline content, if any, from toJSON output.
  //                           itemLength = 0;
  //                         }
  //                         scanPosWithinNodeContent += itemLength;
  //                       }
  //                     }
  //                   }
  //                   return false;
  //                 });


  //                 const outdentableLines = linesToOutdent.filter(l => l.canOutdent);
  //                 // Sort by start position in descending order for safe deletion
  //                 outdentableLines.sort((a, b) => b.start - a.start);

  //                 if (outdentableLines.length > 0) {
  //                   let tr = this.editor.state.tr; // Get a fresh transaction
  //                   let actualTabsRemoved = 0;

  //                   outdentableLines.forEach(line => {
  //                     // `line.start` is the position of the tab character. Delete it.
  //                     tr.delete(line.start, line.start + 1);
  //                     actualTabsRemoved++;
  //                   });

  //                   // This check is technically true if outdentableLines.length > 0,

  //                   if (actualTabsRemoved > 0) {
  //                     const newSelectionFrom = tr.mapping.map(initialFrom);
  //                     const newSelectionTo = tr.mapping.map(initialTo);

  //                     tr.setSelection(TextSelection.create(tr.doc, newSelectionFrom, newSelectionTo));
  //                     this.editor.view.dispatch(tr);
  //                     return true;
  //                   }
  //                 }

  //                 return true;
  //               } else {

  //                 return true;
  //               }
  //             } else {
  //               event.preventDefault();

  //               console.log("Tab pressed")


  //               const { selection, doc, tr: initialTr } = this.editor.state;
  //               const { from: initialFrom, to: initialTo } = selection;

  //               if (!selection.empty) {
  //                 const affectedRanges: { start: number; hasTab: boolean }[] = [];

  //                 doc.nodesBetween(initialFrom, initialTo, (node, pos) => {
  //                   if (node.type.name === 'paragraph' || node.type.name === 'heading') {
  //                     const content = node.content.toJSON() as any[];
                      
  //                     if (content && Array.isArray(content)) {
  //                       let currentLineStartInParagraph = pos + 1;

  //                       if (currentLineStartInParagraph <= initialTo && (pos < initialTo && (pos + node.nodeSize) > initialFrom)) {

  //                         if (!affectedRanges.some(r => r.start === currentLineStartInParagraph)) {
  //                           affectedRanges.push({ start: currentLineStartInParagraph, hasTab: false });
  //                         }
  //                       }

  //                       let currentScanPosInDoc = pos + 1;
  //                       for (let i = 0; i < content.length; i++) {
  //                         const item = content[i];
  //                         let itemLength = 0;
  //                         if (item.type === 'hardBreak') {
  //                           itemLength = 1;
  //                           const lineStartAfterHardBreak = currentScanPosInDoc + itemLength;
  //                           if (lineStartAfterHardBreak >= initialFrom && lineStartAfterHardBreak <= initialTo) {

  //                             if (!affectedRanges.some(r => r.start === lineStartAfterHardBreak)) {
  //                               affectedRanges.push({ start: lineStartAfterHardBreak, hasTab: false });
  //                             }
  //                           }
  //                         } else if (item.type === 'text' && item.text) {
  //                           itemLength = item.text.length;
  //                         } else {
  //                           itemLength = 0;
  //                         }
  //                         currentScanPosInDoc += itemLength;
  //                       }
  //                     }
  //                   }
  //                   return false;
  //                 });


  //                 affectedRanges.sort((a, b) => b.start - a.start);

  //                 if (affectedRanges.length > 0) {
  //                   let tr = initialTr;
  //                   let actualTabsInserted = 0;

  //                   affectedRanges.forEach(range => {
  //                     tr.insertText('\t', range.start);
  //                     actualTabsInserted++;
  //                   });

  //                   if (actualTabsInserted > 0) {
  //                     const newSelectionFrom = tr.mapping.map(initialFrom);
  //                     const newSelectionTo = tr.mapping.map(initialTo);
  //                     tr.setSelection(TextSelection.create(tr.doc, newSelectionFrom, newSelectionTo));
  //                     this.editor.view.dispatch(tr);
  //                     return true;
  //                   } else {
  //                     return true;
  //                   }
  //                 } else {
  //                   return true;
  //                 }
  //               } else {
  //                 console.log("Tab pressed 2")
  //                 return this.editor.chain()
  //                   .focus()
  //                   .insertContent('\t')
  //                   .run();
  //               }
  //             }
  //           }
  //           return false;
  //         }
  //       }
  //     })
  //   ];
  // }
})