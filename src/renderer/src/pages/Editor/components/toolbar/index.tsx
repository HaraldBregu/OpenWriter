import { useCallback, useEffect, useRef, useState } from "react";
import { Editor } from "@tiptap/react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { v4 as uuidv4 } from "uuid";

import HighlightColor from "./components/HighlightColor";
import FormatTextColor from "./components/FormatTextColor";
import SpacingModal from "./components/SpacingModal";
import UndoGroup from "./components/Undo";
import CategorySelectionDialog from "./components/CategorySelectDialog";

import { addComment, addCategory } from "../../../Comments/store/comments.slice";
import { getAllCategories } from "../../../Comments/store/comments.selector";
import { setSidebarOpen } from "../../../store/main.slice";
import { sectionTypes } from "../../../../utils/optionsEnums";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import {
  toggleBold,
  toggleItalic,
  toggleUnderline,
  setFontFamily,
  setFontSize,
  unsetMark,
} from "../../utils/editorCommands";

import useEditorFormatting from "./hooks/useEditorFormatting";
import useEditorSubscriptions from "./hooks/useEditorSubscriptions";
import { adjustCapitalization, adjustLetterSpacing, CapitalizationType, CharacterSpacingType } from "../../utils/editorTransformation";

import { HistoryState } from "../../hooks/types";

import styles from '../../index.module.css';
import Bold from "@/assets/reactIcons/Bold";
import Italic from "@/assets/reactIcons/Italic";
import Underline from "@/assets/reactIcons/Underline";
import Restore from "@/assets/reactIcons/Restore";
import HistoryEdu from "@/assets/reactIcons/HistoryEdu";
import Siglum from "@/assets/reactIcons/Siglum";
import CommentAdd from "@/assets/reactIcons/CommentAdd";
import Bookmark from "@/assets/reactIcons/Bookmark";
import LinkAdd from "@/assets/reactIcons/LinkAdd";
import Divider from "@/components/ui/divider";
import Button from "@/components/ui/button";
import { on } from "events";
import PlusSimple from "@/assets/reactIcons/PlusSimple";
import MinusSimple from "@/assets/reactIcons/MinusSimple";
import { Input } from "@/components/ui/input";
import TextField from "@/components/ui/textField";
import Citation from "@/assets/reactIcons/Citation";
import { SidebarTrigger } from "@/components/ui/sidebar";

// Definire le costanti per i valori comuni
const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 96;
const DEFAULT_FONT_SIZE = '12pt';
const DEFAULT_LINE_SPACING = '1';

interface ToolbarProps {
  open: boolean;
  activeEditor: Editor | null;
  textColorInputRef: React.RefObject<HTMLInputElement>;
  highlightColorInputRef: React.RefObject<HTMLInputElement>;
  undoInputRef: React.RefObject<HTMLInputElement>;
  textColor: string;
  highlightColor: string;
  setTextColor: (color: string) => void;
  setHighlightColor: (color: string) => void;
  lastFontSize: string | null;
  setLastFontSize: (size: string | null) => void;
  isHeading: boolean;
  headingLevel: number;
  onSelectHeading: (level: number) => void;
  setIsHeading: (isHeading: boolean) => void;
  historyState?: HistoryState;
  revertToAction?: (actionId: string) => void;
  trackHistoryActions?: (type: string, description: string) => void;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  onClickBold: () => void;
  onClickItalic: () => void;
  onClickUnderline: () => void;
  onRedo: () => void;
  fontFamily: string;
  onSetFontFamily: (fontFamily: string) => void;
  fontSize: number;
  onSetFontSize: (fontSize: number) => void;
  onIncreaseFontSize: () => void;
  onDecreaseFontSize: () => void;
  onClickAddComment: () => void;
  bookmarksCategories: string[];
  onClickAddBookmark: (category?: string) => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  activeEditor,
  textColorInputRef,
  highlightColorInputRef,
  undoInputRef,
  textColor,
  highlightColor,
  setTextColor,
  setHighlightColor,
  lastFontSize,
  setLastFontSize,
  isHeading,
  setIsHeading,
  headingLevel,
  fontFamily,
  onSelectHeading,
  historyState,
  revertToAction,
  trackHistoryActions,
  isBold,
  isItalic,
  isUnderline,
  onClickBold,
  onClickItalic,
  onClickUnderline,
  onRedo,
  fontSize,
  onSetFontFamily,
  onSetFontSize,
  onIncreaseFontSize,
  onDecreaseFontSize,
  onClickAddComment,
  onClickAddBookmark,
  bookmarksCategories,
}) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const categories = useSelector(getAllCategories);

  const [inputFontSize, setInputFontSize] = useState("12");
  const [isSpacingModalOpen, setIsSpacingModalOpen] = useState(false);
  const [initialLineSpacing, setInitialLineSpacing] = useState(DEFAULT_LINE_SPACING);
  const [initialSpaceBefore, setInitialSpaceBefore] = useState("");
  const [initialSpaceAfter, setInitialSpaceAfter] = useState("");
  const [systemFonts, setSystemFonts] = useState<string[]>([]);
  const [openCategoryModal, setOpenCategoryModal] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [isAlignmentInProgress, setIsAlignmentInProgress] = useState(false);
  const alignmentTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { formatting } = useEditorFormatting(activeEditor);

  const handleListStyleChange = useCallback((listType: 'bullet' | 'ordered') => {
    if (!activeEditor) return;
    try {
      if (listType === 'bullet') {
        activeEditor.chain().focus().toggleBulletList().run();
      } else {
        activeEditor.chain().focus().toggleOrderedList().run();
      }

      if (trackHistoryActions) {
        trackHistoryActions("listStyle", `Applied ${listType} list`);
      }
    } catch (error) {
      console.error(`Errore nell'applicare la lista ${listType}:`, error);
    }
  }, [activeEditor, trackHistoryActions]);

  useEditorSubscriptions(activeEditor, {
    onCapitalizationChange: (type: string) => {
      if (activeEditor) {
        adjustCapitalization(activeEditor, type as CapitalizationType);

        if (trackHistoryActions) {
          trackHistoryActions("capitalization", `Applied ${type} capitalization`);
        }
      }
    },
    onCharacterSpacingChange: (type: string) => {
      if (activeEditor) {
        adjustLetterSpacing(activeEditor, type as CharacterSpacingType);

        if (trackHistoryActions) {
          trackHistoryActions("letterSpacing", `Applied ${type} letter spacing`);
        }
      }
    },
    onCharacterStyleChange: (type: string) => {
      if (!activeEditor) return;
      try {
        switch (type) {
          case "bold":
            activeEditor.chain().focus().toggleBold().run();
            break;
          case "italic":
            activeEditor.chain().focus().toggleItalic().run();
            break;
          case "underline":
            activeEditor.chain().focus().toggleUnderline().run();
            break;
          case "strikethrough":
            activeEditor.chain().focus().toggleStrike().run();
            break;
          case "code":
            activeEditor.chain().focus().toggleCode().run();
            break;
          default:
            console.warn(`Stile carattere non supportato: ${type}`);
        }

        if (trackHistoryActions) {
          trackHistoryActions("characterStyle", `Applied ${type} style`);
        }
      } catch (error) {
        console.error(`Errore nell'applicare lo stile ${type}:`, error);
      }
    },
    onListStyleChange: (type: string) => {
      if (!activeEditor) return;
      if (type === 'bullet') {
        handleListStyleChange('bullet');
      }
      else if (type === "numbering") {
        handleListStyleChange('ordered');
      }
    },
    onTextAlignmentChange: (type: string) => {
      if (!activeEditor || isAlignmentInProgress) return;

      try {
        if (alignmentTimeoutRef.current) {
          clearTimeout(alignmentTimeoutRef.current);
        }

        setIsAlignmentInProgress(true);

        const alignments = {
          "left": "left",
          "center": "center",
          "right": "right",
          "justify": "justify"
        };

        const alignment = alignments[type as keyof typeof alignments];
        if (alignment) {
          activeEditor.chain().setTextAlign(alignment).run();

          if (trackHistoryActions) {
            trackHistoryActions("alignment", `Set text alignment to ${alignment}`);
          }
        }
      } catch (error) {
        console.error(`Errore nell'applicare l'allineamento ${type}:`, error);
      } finally {
        alignmentTimeoutRef.current = setTimeout(() => {
          setIsAlignmentInProgress(false);
          alignmentTimeoutRef.current = null;
        }, 500);
      }
    },
    onIndentLevelChange: (increase: boolean) => {
      if (!activeEditor) return;
      try {
        if (increase) {
          activeEditor.commands.increaseIndent();
        } else {
          activeEditor.commands.decreaseIndent();
        }

        if (trackHistoryActions) {
          const actionType = increase ? "indent" : "outdent";
          const description = increase ? "Increased indentation" : "Decreased indentation";
          trackHistoryActions(actionType, description);
        }
      } catch (error) {
        console.error("Errore nell'applicare l'indentazione:", error);
      }
    },
    onShowSpacingSettings: () => {
      setIsSpacingModalOpen(true);
    },
    onSetSpacing: (space: string) => {
      if (activeEditor) {
        activeEditor.chain().focus().setLineHeight(space).run();

        if (trackHistoryActions) {
          trackHistoryActions("lineSpacing", `Set line spacing to ${space}`);
        }
      }
    },
    onLigatureChange: (type: string) => {
      if (!activeEditor) return;
      try {
        if (type === "none") {
          activeEditor.chain().focus().unsetMark("ligature").run();
        } else {
          activeEditor.chain().focus().setLigature(type as LigatureType).run();
        }

        if (trackHistoryActions) {
          const description = type === "none" ? "Removed ligature" : `Applied ${type} ligature`;
          trackHistoryActions("ligature", description);
        }
      } catch (error) {
        console.error("Errore nell'applicare la legatura:", error);
      }
    }
  });

  useEffect(() => {
    window.electron.ipcRenderer.send('request-system-fonts');
    const cleanup = window.electron.ipcRenderer.on('receive-system-fonts', (_: any, fonts: string[]) => {
      setSystemFonts(fonts);
    });

    return () => cleanup();
  }, []);

  // Gestione delle transazioni per il passaggio tra heading e paragrafo
  useEffect(() => {
    if (!activeEditor) return;
    const isHandlingTransaction = { current: false };
    const handleTransaction = () => {
      if (isHandlingTransaction.current) return;
      try {
        const currentNode = activeEditor.state.selection.$head.parent.type.name;
        if (currentNode === "paragraph" && isHeading) {
          isHandlingTransaction.current = true;
          setIsHeading(false);
          const currentFontSize = activeEditor.getAttributes("textStyle").fontSize;
          if (lastFontSize && currentFontSize !== lastFontSize) {
            setFontSize(activeEditor, lastFontSize);
          }
        }
      } catch (error) {
        console.error("Errore in handleTransaction:", error);
      } finally {
        setTimeout(() => {
          isHandlingTransaction.current = false;
        }, 10);
      }
    };
    activeEditor.on("transaction", handleTransaction);
    return () => {
      activeEditor.off("transaction", handleTransaction);
    };
  }, [activeEditor, isHeading, lastFontSize, setIsHeading]);

  useEffect(() => {
    if (activeEditor) {
      const fontSize = activeEditor.getAttributes("textStyle").fontSize || "default";
      setInputFontSize(fontSize === "default" ? "12" : fontSize.replace(/pt|px/g, ""));
    }
  }, [activeEditor, formatting]);

  /*
  // OLD LOGIC
  const handleHeadingChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    console.log("🚀 ~ handleHeadingChange ~ e:", e)
    const level = parseInt(e.target.value, 10);
    console.log("🚀 ~ handleHeadingChange ~ level:", level)
    // onSelectHeading(level);

    // OLD LOGIC
    if (!activeEditor) return;
    //const level = parseInt(e.target.value, 10);
    try {
      if (level === 0) {
        activeEditor.chain().focus().setParagraph().run();
        if (lastFontSize) {
          setFontSize(activeEditor, lastFontSize);
        }
      } else {
        const currentFontSize = activeEditor.getAttributes("textStyle").fontSize;

        if (currentFontSize) {
          setLastFontSize(currentFontSize);
        }
        activeEditor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 | 4 | 5 | 6 }).unsetMark("textStyle").run();
        setIsHeading(true);
      }
    } catch (error) {
      console.error("Errore in handleHeadingChange:", error);
    }
  }, [activeEditor, lastFontSize, setIsHeading, setLastFontSize]);
*/
  /*
    const handleFontFamilyChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
      console.log("🚀 ~ handleFontFamilyChange ~ e:", e)
      onSetFontFamily(e.target.value)
      return;
      if (!activeEditor) return;
      const value = e.target.value;
      try {
        if (value === "default") {
          unsetMark(activeEditor, "fontFamily");
        } else {
          setFontFamily(activeEditor, value);
        }
      } catch (error) {
        console.error("Errore in handleFontFamilyChange:", error);
      }
    }, [activeEditor]);
  */
  const handleFontSizeChange = useCallback((value: string) => {
    if (!activeEditor) return;
    try {
      if (value === "default") {
        unsetMark(activeEditor, "textStyle");
      } else {
        // Assicuriamoci che il valore abbia l'unità corretta
        const sizeValue = value.includes("pt") ? value : `${value}pt`;
        setFontSize(activeEditor, sizeValue);
      }
    } catch (error) {
      console.error("Errore in handleFontSizeChange:", error);
    }
  }, [activeEditor]);

  /*
  const handleIncreaseFontSize = useCallback(() => {
 
    if (!activeEditor) return;
    const currentSize = activeEditor.getAttributes("textStyle").fontSize;
    if (!currentSize || currentSize === "default") {
      // Dimensione di default di Word
      setFontSize(activeEditor, DEFAULT_FONT_SIZE);
      return;
    }

    const numericSize = parseInt(currentSize);
    if (numericSize < 96) {
      const newSize = numericSize + 1;
      setFontSize(activeEditor, `${newSize}pt`);
    }
  }, [activeEditor]);
  */
  /*
    const handleDecreaseFontSize = useCallback(() => {
      if (!activeEditor) return;
      const currentSize = activeEditor.getAttributes("textStyle").fontSize;
      if (!currentSize || currentSize === "default") {
        setFontSize(activeEditor, "10pt");
        return;
      }
  
      const numericSize = parseInt(currentSize);
      if (numericSize > 6) {
        const newSize = numericSize - 1;
        setFontSize(activeEditor, `${newSize}pt`);
      }
    }, [activeEditor]);
  */

  const addCommentFromSelection = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!activeEditor) return;
    const { from, to } = activeEditor.state.selection;
    const selectedContent = activeEditor.state.doc.textBetween(from, to, " ");
    if (!selectedContent) return;
    setSelectedText(selectedContent);
    dispatch(setSidebarOpen(true));
    if (categories.length === 0) {
      const defaultCategoryId = uuidv4();
      dispatch(addCategory({ id: defaultCategoryId, name: `Category 1` }));
      dispatch(addComment({
        categoryId: defaultCategoryId,
        comment: { title: "New Comment", selectedText: selectedContent, comment: "" }
      }));
    } else if (categories.length === 1) {
      dispatch(addComment({
        categoryId: categories[0].id,
        comment: { title: "New Comment", selectedText: selectedContent, comment: "" }
      }));
    } else {
      setAnchorEl(event.currentTarget);
      setOpenCategoryModal(true);
    }
  };

  const handleCategorySelect = (categoryId: string) => {
    dispatch(addComment({
      categoryId,
      comment: { title: "New Comment", selectedText, comment: "" }
    }));
    handleCloseModal();
  };

  const handleCloseModal = () => {
    setOpenCategoryModal(false);
    setAnchorEl(null);
  };

  const handleHighlight = (color: string) => {
    if (!activeEditor) return;
    const { from, to } = activeEditor.state.selection;
    if (from !== to) {
      if (color !== "none") {
        activeEditor.chain().focus().setHighlight({ color }).run();
        activeEditor.chain().focus().setTextSelection(to).insertContent(" ").unsetMark("highlight").run();
      } else {
        activeEditor.chain().focus().unsetHighlight().run();
      }
    }
  };

  const addIdentifiedText = useCallback(() => {
    console.log('sto prima')
    if (!activeEditor) return;
    console.log('sono qui')
    try {
      const { from, to } = activeEditor.state.selection;

      // Verifica se c'è testo selezionato
      if (from === to) {
        console.log("Nessun testo selezionato");
        return;
      }

      const id = uuidv4();
      console.log("Sto impostando l'ID:", id);

      // Utilizzo più esplicito del comando
      activeEditor.chain()
        .focus()
        .setMark('apparatusText', { id })
        .run();

      if (trackHistoryActions) {
        trackHistoryActions("apparatusText", "Added identified text");
      }

    } catch (error) {
      console.error("Errore nell'aggiungere apparatusText:", error);
    }
  }, [activeEditor, trackHistoryActions]);

  const handleTextFormatColor = useCallback((color: string) => {
    if (!activeEditor) return;
    activeEditor.chain().focus().setColor(color).run();
    setTextColor(color);
  }, [activeEditor, setTextColor]);

  return (
    <div className={styles["toolbar"]}>
      <SidebarTrigger />
      <Divider />
      {/* UNDO GROUP */}
      <UndoGroup
        activeEditor={activeEditor}
        UndoInputRef={undoInputRef}
        historyState={historyState}
        revertToAction={revertToAction}
        trackHistoryActions={trackHistoryActions}
      />
      {/* REDO */}
      <Button
        intent="secondary"
        variant="icon"
        size="iconSm"
        icon={<Restore intent='primary' variant='tonal' size='small' />}
        onClick={onRedo}
      />
      {/* HEADING SELECT */}
      <Divider />
      <select
        className={styles["heading-select"]}
        value={headingLevel}
        onChange={(e) => onSelectHeading(parseInt(e.target.value, 10))}>
        {sectionTypes.map((type, index) => (
          <option
            className={styles["heading-option"]}
            value={type.value}
            key={`${type.value}-${index}`}>
            {t(type.label)}
          </option>
        ))}
      </select>
      <Divider />
      {/* FONT FAMILY SELECT */}
      <select
        className={styles["font-family-select"]}
        value={fontFamily}
        onChange={(e) => onSetFontFamily(e.target.value)}>
        {systemFonts.map((font, index) => (
          <option
            key={index}
            value={font}
            style={{ fontFamily: font }}>
            {font}
          </option>
        ))}
      </select>
      <Divider />
      {/* FONT SIZE CONTROLS */}
      <div className={styles["font-size-controls"]}>
        <Button
          intent="secondary"
          variant="icon"
          size="iconSm"
          icon={<PlusSimple intent='primary' variant='tonal' size='small' />}
          onClick={onIncreaseFontSize}
        />
        <input
          type="text"
          className={styles["font-size-input"]}
          value={fontSize}
          onChange={(e) => {
            if (/^\d*$/.test(e.target.value)) {
              //setInputFontSize(e.target.value);
              onSetFontSize(parseInt(e.target.value));
            }
          }}
          onBlur={() => {
            let numericValue = parseInt(inputFontSize);
            if (isNaN(numericValue) || numericValue < MIN_FONT_SIZE) numericValue = MIN_FONT_SIZE;
            else if (numericValue > MAX_FONT_SIZE) numericValue = MAX_FONT_SIZE;
            setInputFontSize(numericValue.toString());
            handleFontSizeChange(`${numericValue}pt`); // Usa pt invece di px
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
          }}
          size={3}
        />
        <Button
          intent="secondary"
          variant="icon"
          size="iconSm"
          icon={<MinusSimple intent='primary' variant='tonal' size='small' />}
          onClick={onDecreaseFontSize}
        />
      </div>
      <Divider />
      {/* BOLD CONTROL */}
      <Button
        intent="secondary"
        variant={isBold ? "tonal" : "icon"}
        size="iconSm"
        icon={<Bold intent='primary' variant='tonal' size='small' />}
        onClick={() => onClickBold()}
        aria-pressed={isBold}
      />
      {/* ITALIC CONTROL */}
      <Button
        intent="secondary"
        variant={isItalic ? "tonal" : "icon"}
        size="iconSm"
        icon={<Italic intent='primary' variant='tonal' size='small' />}
        onClick={() => onClickItalic()}
        aria-pressed={isItalic}
      />
      {/* UNDERLINE CONTROL */}
      <Button
        intent="secondary"
        variant={isUnderline ? "tonal" : "icon"}
        size="iconSm"
        icon={<Underline intent='primary' variant='tonal' size='small' />}
        onClick={() => onClickUnderline()}
        aria-pressed={isUnderline}
      />
      <Divider />
      {/* TEXT COLOR CONTROL */}
      <FormatTextColor
        onSelect={(color) => {
          console.log("🚀 ~ onSelect ~ color:", color)
          setTextColor(color);
          handleTextFormatColor(color);
        }}
        FormatTextColorInputRef={textColorInputRef}
        textColor={textColor}
      />
      <HighlightColor
        onSelect={(color) => {
          setHighlightColor(color);
          handleHighlight(color);
        }}
        highlightColorInputRef={highlightColorInputRef}
        highlightColor={highlightColor}
      />
      <Divider />
      {/* REVIEW THIS PART */}
      <Button
        intent="secondary"
        variant="icon"
        size="iconSm"
        icon={<HistoryEdu intent='primary' variant='tonal' size='small' />}
        onClick={() => activeEditor?.chain().focus().toggleBlockquote().run()}
      />
      <Button
        intent="secondary"
        variant="icon"
        size="iconSm"
        icon={<Siglum intent='primary' variant='tonal' size='small' />}
        onClick={() => activeEditor?.chain().focus().toggleBlockquote().run()}
      />
      <Button
        intent="secondary"
        variant="icon"
        size="iconSm"
        icon={<Citation intent='primary' variant='tonal' size='small' />}
        onClick={() => activeEditor?.chain().focus().toggleBlockquote().run()}
      />
      <Divider />
      {/* COMMENT ADD */}
      <Button
        intent="secondary"
        variant="icon"
        size="iconSm"
        icon={<CommentAdd intent='primary' variant='tonal' size='small' />}
        onClick={(_) => onClickAddComment()}
      />
      {/* BOOKMARK ADD */}
     {bookmarksCategories.length === 0 && <Button
        intent="secondary"
        variant="icon"
        size="iconSm"
        icon={<Bookmark intent='primary' variant='tonal' size='small' />}
        onClick={(_) => onClickAddBookmark()}
      />}
      {bookmarksCategories.length > 0 && <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            intent="secondary"
            variant="icon"
            size="iconSm"
            icon={<Bookmark intent='primary' variant='tonal' size='small' />}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>Categories</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {bookmarksCategories.map((category) => (
            <DropdownMenuItem key={category} onClick={() => {
                console.log("category:", category)
                onClickAddBookmark(category)
              }
            }>{category}</DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>}
      {/* LINK ADD */}
      <Button
        intent="secondary"
        variant="icon"
        size="iconSm"
        icon={<LinkAdd intent='primary' variant='tonal' size='small' />}
        onClick={() => addIdentifiedText()}
      />

      {/*   <button onClick={() => {
        console.log('sto qui')
        
        //@ts-ignore
        const $doc = activeEditor?.$doc
  
        //activeEditor?.chain().setNodeSelection(30).scrollIntoView().run();

        // Get all nodes of type 'heading' in the document
        //const $headings = activeEditor?.$nodes('heading')
        const $headings = activeEditor?.$nodes('text')

        //@ts-ignore
        const focusHeadingWithGivenUuid = (uuid: string) => {
          let posOfHeading = -1
          activeEditor?.state.doc.descendants((node, pos) => {
            if (node.type.name === 'text' && node.attrs.id === uuid)
              posOfHeading = pos // `pos + node.nodeSize - 1` if you wanna focus at the end of line, maybe you don't need that `- 1` idk, you can try it out
            else
              return
          })
          if (posOfHeading !== -1) activeEditor?.commands.focus(posOfHeading)
        }

        //@ts-ignore
        function findNodePositionByAttribute(editor: Editor, nodeTypeName: string, attrKey: string, attrValue: string): number | null {
          let foundPos: number | null = null;

          editor.state.doc.descendants((node: ProseMirrorNode, pos: number) => {
            // console.log(node.content)
            node.content.forEach((node) => {
              // console.log(node)
              //@ts-ignore
              node.marks.forEach((mark) => {
                //console.log(mark)
                console.log(mark.attrs)
                if (mark.attrs.id === attrValue) {
                  foundPos = pos;
                  return false; // stop traversal
                }
              })
              // console.log(node.marks)
            })
            return true;
          });

          return foundPos;
        }

        if (activeEditor) {
          const pos = findNodePositionByAttribute(activeEditor, 'apparatusText', 'id', 'cce391e7-77fa-43e9');
          console.log(pos)
          if (pos) {
            activeEditor?.commands.setTextSelection(pos);
            activeEditor?.commands.focus(pos);
            activeEditor?.commands.scrollIntoView();
          }
        }

        //console.log(focusHeadingWithGivenUuid('cce391e7-77fa-43e9-af5d-f322137d61c3'))
      }}>
        <span>Scroll to identified text</span>
      </button> */}

      {isSpacingModalOpen && (
        <SpacingModal
          initialLineSpacing={initialLineSpacing}
          initialSpaceBefore={initialSpaceBefore}
          initialSpaceAfter={initialSpaceAfter}
          onApply={(line, before, after) => {
            if (activeEditor) {
              activeEditor.chain().focus().setLineHeight(line).setSpacingBefore(`${before}pt`).setSpacingAfter(`${after}pt`).run();
            }
            setInitialLineSpacing(line);
            setInitialSpaceBefore(before);
            setInitialSpaceAfter(after);
            setIsSpacingModalOpen(false);
          }}
          onClose={() => setIsSpacingModalOpen(false)}
          onReset={() => {
            if (activeEditor) {
              activeEditor.chain().focus().resetLineHeight().unsetMark("spacing").run();
            }
            setInitialLineSpacing("1");
            setInitialSpaceBefore("");
            setInitialSpaceAfter("");
          }}
        />
      )}
      <CategorySelectionDialog
        open={openCategoryModal}
        anchorEl={anchorEl}
        categories={categories}
        onClose={handleCloseModal}
        onCategorySelect={handleCategorySelect}
      />
    </div>
  );
};

export default Toolbar;
