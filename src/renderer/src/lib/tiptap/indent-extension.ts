import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from 'prosemirror-state';

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
      maxIndent: 8,
      indentStep: 40,
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading', 'bulletedList', 'orderList'],
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) => parseInt(element.getAttribute('data-indent') || '0', 10),
            renderHTML: (attributes) => ({
              'style': `margin-left: ${attributes.indent * this.options.indentStep}px !important;`,
              'data-indent': attributes.indent
            }),
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
            const paragraphIndent = this.editor.getAttributes('paragraph').indent;
            const headingIndent = this.editor.getAttributes('heading').indent;
            const indent = paragraphIndent ?? headingIndent ?? 0;
            const maxIndent = Math.min(this.options.maxIndent, (this.editor.view.dom.offsetWidth / this.options.indentStep) - 2); // Calculate max indent based on editor width or at most the max indent

            // Prevent exceeding max indent
            if (indent >= maxIndent) {
              return false;
            }
            return commands.updateAttributes(Number.isInteger(paragraphIndent) ? 'paragraph' : 'heading', {
              indent: Math.min(indent + 1, maxIndent),
            });
          },
      decreaseIndent:
        () =>
          ({ commands }) => {
            const paragraphIndent = this.editor.getAttributes('paragraph').indent;
            const headingIndent = this.editor.getAttributes('heading').indent;
            const indent = paragraphIndent ?? headingIndent ?? 0;
            return commands.updateAttributes(Number.isInteger(paragraphIndent) ? 'paragraph' : 'heading', {
              indent: Math.max(indent - 1, 0),
            });
          },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Shift-Tab': ({ editor }) => {
        if (editor.isActive('codeBlock')) return false;
        if (editor.isActive('bulletedList') || editor.isActive('orderList')) {
          return editor.chain().focus().liftListItem('listItem').run();
        }

        try {
          // Ottieni la selezione corrente
          const { selection } = editor.state;
          if (selection instanceof TextSelection && selection.empty) {
            // Ottieni la posizione del paragrafo contenente il cursore
            const $pos = selection.$from;
            const node = $pos.parent;

            // Definisci il tipo per gli elementi del contenuto
            interface ContentNode {
              type: string;
              text?: string;
            }

            // Analizza il contenuto del paragrafo per trovare la linea corrente
            const content = node.content.toJSON() as ContentNode[];
            if (!content || !Array.isArray(content)) {
              return false;
            }

            const offset = $pos.parentOffset;

            // Trova l'indice del nodo corrente e la posizione all'interno della linea
            let currentPosition = 0;
            let currentLineStartPos = $pos.start();
            let currentTextNode: ContentNode | null = null;

            // Attraversa il contenuto per trovare la posizione del cursore
            for (let i = 0; i < content.length; i++) {
              const item = content[i];

              // Se è un hardBreak resetta la posizione corrente
              if (item.type === 'hardBreak') {
                currentPosition++;
                currentLineStartPos = $pos.start() + currentPosition;
                continue;
              }

              // Se è un nodo di testo
              if (item.type === 'text') {
                const textLength = item.text ? item.text.length : 0;

                // Controlliamo se il cursore è in questo nodo di testo
                if (currentPosition <= offset && offset <= currentPosition + textLength) {
                  currentTextNode = item;
                  break;
                }

                currentPosition += textLength;
              }
            }

            // Verifica se il nodo di testo corrente inizia con un tab
            if (currentTextNode && currentTextNode.text && currentTextNode.text.startsWith('\t')) {
              // Rimuovi il tab
              return editor.chain()
                .deleteRange({ from: currentLineStartPos, to: currentLineStartPos + 1 })
                .run();
            }
          }
        } catch (error) {
          console.error('Errore durante Shift+Tab:', error);
        }

        // Nessun tab trovato o cursore non valido
        return false;
      },
      'Backspace': ({ editor }) => {
        if (editor.isActive('bulletedList') || editor.isActive('orderList')) {
          const { selection } = editor.state;

          // Se c'è una selezione non vuota (selezione multipla), applica liftListItem a tutti gli elementi
          if (!selection.empty) {
            return editor.chain().focus().liftListItem('listItem').run();
          }

          // Per la selezione singola, controlla se siamo all'inizio dell'elemento
          const { $from } = selection;
          if ($from.parentOffset === 0) {
            // Prova a diminuire il livello di rientro
            if (editor.can().liftListItem('listItem')) {
              return editor.chain().focus().liftListItem('listItem').run();
            }
            // Se non possiamo diminuire il rientro, esci dalla lista
            return editor.chain().focus().liftListItem('listItem').run();
          }
        }
        return false;
      },
    };
  },
  
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('handleTabIndent'),
        props: {
          handleKeyDown: (_, event) => {
            if (event.key === 'Tab' && !event.ctrlKey && !event.metaKey) {
              if (this.editor.isActive('bulletedList') || this.editor.isActive('orderList')) {
                if (!event.shiftKey) {
                  event.preventDefault();
                  const { state } = this.editor;
                  const { selection } = state;
                  const { $from } = selection;

                  const isFirstListItem = () => {
                    const resolvedPos = state.doc.resolve($from.pos);
                    let depth = resolvedPos.depth;

                    while (depth > 0) {
                      const node = resolvedPos.node(depth);
                      if (node.type.name === 'listItem') {
                        const index = resolvedPos.index(depth);
                        return index === 0;
                      }
                      depth--;
                    }
                    return false;
                  };

                  if (isFirstListItem()) {
                    const listType = this.editor.isActive('bulletedList') ? 'bulletedList' : 'orderList';
                    const listIndent = this.editor.getAttributes(listType).indent || 0;
                    const maxIndent = Math.min(this.options.maxIndent, (this.editor.view.dom.offsetWidth / this.options.indentStep) - 2);
                    try {
                      const newIndent = Math.min(listIndent + 1, maxIndent);
                      const tr = this.editor.state.tr;
                      const selection = this.editor.state.selection;
                      let found = false;

                      this.editor.state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
                        if ((node.type.name === 'bulletedList' || node.type.name === 'orderList') && !found) {
                          found = true;
                          tr.setNodeMarkup(pos, null, {
                            ...node.attrs,
                            indent: newIndent
                          });
                          return false;
                        }
                        return true;
                      });

                      if (found) {
                        this.editor.view.dispatch(tr);
                        return true;
                      }

                      return this.editor.chain()
                        .focus()
                        .updateAttributes(listType, { indent: newIndent })
                        .run();
                    } catch (e) {
                      console.error('Error indenting list:', e);
                      // Fallback: usa il comportamento standard
                      return this.editor.chain().focus()
                        .splitListItem('listItem')
                        .sinkListItem('listItem')
                        .run();
                    }
                  } else {
                    // Comportamento normale per elementi successivi
                    return this.editor.chain()
                      .focus()
                      .splitListItem('listItem')
                      .sinkListItem('listItem')
                      .run();
                  }
                }
                // Shift+Tab gestito in addKeyboardShortcuts
                return false;
              }

              // Gestione per paragrafi normali
              if (this.editor.isActive('codeBlock'))
                return false;

              if (event.shiftKey) {
                event.preventDefault();
                const { selection, doc } = this.editor.state;
                const { from: initialFrom, to: initialTo } = selection;

                if (!selection.empty) {
                  const linesToOutdent: { start: number; canOutdent: boolean }[] = [];


                  doc.nodesBetween(initialFrom, initialTo, (node, pos) => {
                    if (node.type.name === 'paragraph' || node.type.name === 'heading') {
                      const content = node.content.toJSON() as any[];
                      if (content && Array.isArray(content)) {

                        let currentLineContentStart = pos + 1;


                        if (currentLineContentStart <= initialTo && (pos < initialTo && (pos + node.nodeSize) > initialFrom)) {
                          const charAtStart = doc.textBetween(currentLineContentStart, currentLineContentStart + 1, "", "");
                          const canOutdentThisLine = charAtStart === '\t';
                          if (!linesToOutdent.some(l => l.start === currentLineContentStart)) {
                            linesToOutdent.push({ start: currentLineContentStart, canOutdent: canOutdentThisLine });
                          }
                        }

                        // Find subsequent lines after hardBreaks using your existing iteration style

                        let scanPosWithinNodeContent = pos + 1;

                        for (let i = 0; i < content.length; i++) {
                          const item = content[i];
                          let itemLength = 0;

                          if (item.type === 'hardBreak') {
                            // The line after hardBreak starts immediately after the hardBreak character itself.
                            itemLength = 1;
                            currentLineContentStart = scanPosWithinNodeContent + itemLength;

                            // Check if this new line is relevant to the selection
                            if (currentLineContentStart >= initialFrom && currentLineContentStart <= initialTo) {
                              const charAtStartOfNewLine = doc.textBetween(currentLineContentStart, currentLineContentStart + 1, "", "");
                              const canOutdentNewLine = charAtStartOfNewLine === '\t';
                              if (!linesToOutdent.some(l => l.start === currentLineContentStart)) {
                                linesToOutdent.push({ start: currentLineContentStart, canOutdent: canOutdentNewLine });
                              }
                            }
                          } else if (item.type === 'text' && item.text) {
                            itemLength = item.text.length;
                          } else {
                            // Fallback for other inline content, if any, from toJSON output.
                            itemLength = 0;
                          }
                          scanPosWithinNodeContent += itemLength;
                        }
                      }
                    }
                    return false;
                  });


                  const outdentableLines = linesToOutdent.filter(l => l.canOutdent);
                  // Sort by start position in descending order for safe deletion
                  outdentableLines.sort((a, b) => b.start - a.start);

                  if (outdentableLines.length > 0) {
                    let tr = this.editor.state.tr; // Get a fresh transaction
                    let actualTabsRemoved = 0;

                    outdentableLines.forEach(line => {
                      // `line.start` is the position of the tab character. Delete it.
                      tr.delete(line.start, line.start + 1);
                      actualTabsRemoved++;
                    });

                    // This check is technically true if outdentableLines.length > 0,

                    if (actualTabsRemoved > 0) {
                      const newSelectionFrom = tr.mapping.map(initialFrom);
                      const newSelectionTo = tr.mapping.map(initialTo);

                      tr.setSelection(TextSelection.create(tr.doc, newSelectionFrom, newSelectionTo));
                      this.editor.view.dispatch(tr);
                      return true;
                    }
                  }

                  return true;
                } else {

                  return true;
                }
              } else {
                event.preventDefault();

                console.log("Tab pressed")


                const { selection, doc, tr: initialTr } = this.editor.state;
                const { from: initialFrom, to: initialTo } = selection;

                if (!selection.empty) {
                  const affectedRanges: { start: number; hasTab: boolean }[] = [];

                  doc.nodesBetween(initialFrom, initialTo, (node, pos) => {
                    if (node.type.name === 'paragraph' || node.type.name === 'heading') {
                      const content = node.content.toJSON() as any[];
                      
                      if (content && Array.isArray(content)) {
                        let currentLineStartInParagraph = pos + 1;

                        if (currentLineStartInParagraph <= initialTo && (pos < initialTo && (pos + node.nodeSize) > initialFrom)) {

                          if (!affectedRanges.some(r => r.start === currentLineStartInParagraph)) {
                            affectedRanges.push({ start: currentLineStartInParagraph, hasTab: false });
                          }
                        }

                        let currentScanPosInDoc = pos + 1;
                        for (let i = 0; i < content.length; i++) {
                          const item = content[i];
                          let itemLength = 0;
                          if (item.type === 'hardBreak') {
                            itemLength = 1;
                            const lineStartAfterHardBreak = currentScanPosInDoc + itemLength;
                            if (lineStartAfterHardBreak >= initialFrom && lineStartAfterHardBreak <= initialTo) {

                              if (!affectedRanges.some(r => r.start === lineStartAfterHardBreak)) {
                                affectedRanges.push({ start: lineStartAfterHardBreak, hasTab: false });
                              }
                            }
                          } else if (item.type === 'text' && item.text) {
                            itemLength = item.text.length;
                          } else {
                            itemLength = 0;
                          }
                          currentScanPosInDoc += itemLength;
                        }
                      }
                    }
                    return false;
                  });


                  affectedRanges.sort((a, b) => b.start - a.start);

                  if (affectedRanges.length > 0) {
                    let tr = initialTr;
                    let actualTabsInserted = 0;

                    affectedRanges.forEach(range => {
                      tr.insertText('\t', range.start);
                      actualTabsInserted++;
                    });

                    if (actualTabsInserted > 0) {
                      const newSelectionFrom = tr.mapping.map(initialFrom);
                      const newSelectionTo = tr.mapping.map(initialTo);
                      tr.setSelection(TextSelection.create(tr.doc, newSelectionFrom, newSelectionTo));
                      this.editor.view.dispatch(tr);
                      return true;
                    } else {
                      return true;
                    }
                  } else {
                    return true;
                  }
                } else {
                  console.log("Tab pressed 2")
                  return this.editor.chain()
                    .focus()
                    .insertContent('\t')
                    .run();
                }
              }
            }
            return false;
          }
        }
      })
    ];
  }
});

export default IndentExtension;