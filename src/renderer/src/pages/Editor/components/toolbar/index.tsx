import React, { useCallback, useEffect, useState } from "react";
import { Editor } from "@tiptap/react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { v4 as uuidv4 } from "uuid";
import { Divider } from "@mui/material";

import HighlightColor from "./components/HighlightColor";
import FormatTextColor from "./components/FormatTextColor";
import SpacingModal from "./components/SpacingModal";
import UndoGroup from "./components/Undo";
import CategorySelectionDialog from "./components/CategorySelectDialog";

import { addComment, addCategory } from "../../../Comments/store/comments.slice";
import { getAllCategories } from "../../../Comments/store/comments.selector";
import { setSidebarOpen } from "../../../MainContainer/store/main.slice";
import { sectionTypes } from "../../../../utils/optionsEnums";

import {
  toggleBold,
  toggleItalic,
  toggleUnderline,
  setFontFamily,
  setFontSize,
  unsetMark
} from "../../utils/editorCommands";

import useEditorFormatting from "./hooks/useEditorFormatting";
import useEditorSubscriptions from "./hooks/useEditorSubscriptions";
import { adjustCapitalization, adjustLetterSpacing, CapitalizationType, CharacterSpacingType } from "../../utils/editorTransformation";

import { HistoryState } from "../../hooks/types";

import styles from '../../index.module.css';


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
  setTextColor: (color: string) => void;
  setHighlightColor: (color: string) => void;
  lastFontSize: string | null;
  setLastFontSize: (size: string | null) => void;
  isHeading: boolean;
  setIsHeading: (isHeading: boolean) => void;
  historyState?: HistoryState;
  revertToAction?: (actionId: string) => void;
  trackHistoryActions?: (type: string, description: string) => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  open,
  activeEditor,
  textColorInputRef,
  highlightColorInputRef,
  undoInputRef,
  setTextColor,
  setHighlightColor,
  lastFontSize,
  setLastFontSize,
  isHeading,
  setIsHeading,
  historyState,
  revertToAction,
  trackHistoryActions
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
      if (activeEditor) {
        const alignments = {
          "left": "left",
          "center": "center",
          "right": "right",
          "justify": "justify"
        };

        const alignment = alignments[type as keyof typeof alignments];
        if (alignment) {
          activeEditor.chain().focus().setTextAlign(alignment).run();

          if (trackHistoryActions) {
            trackHistoryActions("alignment", `Set text alignment to ${alignment}`);
          }
        }
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
    /*const handleFontsReceived = (fonts: string[]) => {
      setSystemFonts(fonts);
    };*/


    //const cleanup = window.electron.getSystemFonts(handleFontsReceived);
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

  const handleHeadingChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!activeEditor) return;
    const level = parseInt(e.target.value, 10);
    try {
      if (level === 0) {
        activeEditor.chain().focus().setParagraph().run();
        if (lastFontSize) {
          setFontSize(activeEditor, lastFontSize);
        }
        setIsHeading(false);
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

  const handleFontFamilyChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
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

  const handleTextFormatColor = useCallback((color: string) => {
    if (!activeEditor) return;
    activeEditor.chain().focus().setColor(color).run();
    setTextColor(color);
  }, [activeEditor, setTextColor]);

  return (
    <div className={styles["toolbar"]}>
      <div className={styles["toolbar-item"]}>
        <button onClick={() => dispatch(setSidebarOpen(!open))} className={styles["active"]}>
          <span className="material-symbols-outlined">dock_to_right</span>
        </button>
      </div>
      <Divider sx={{ height: "1rem", margin: "4px", padding: "4px", borderColor: "#ccc", alignSelf: "center" }} orientation="vertical" flexItem />
      <UndoGroup
        activeEditor={activeEditor}
        UndoInputRef={undoInputRef}
        historyState={historyState}
        revertToAction={revertToAction}
        trackHistoryActions={trackHistoryActions}
      />
      <button onClick={() => activeEditor?.chain().focus().redo().run()}>
        <span className="material-symbols-outlined">redo</span>
      </button>
      <Divider sx={{ height: "1rem", margin: "4px", padding: "4px", borderColor: "#ccc", alignSelf: "center" }} orientation="vertical" flexItem />
      <select className={styles["heading-select"]} value={formatting.headingLevel} onChange={handleHeadingChange}>
        {sectionTypes.map((type, index) => (
          <option className={styles["heading-option"]} value={type.value} key={`${type.value}-${index}`}>
            {t(type.label)}
          </option>
        ))}
      </select>
      <Divider sx={{ height: "1rem", margin: "4px", padding: "4px", borderColor: "#ccc", alignSelf: "center" }} orientation="vertical" flexItem />
      <select className={styles["font-family-select"]} value={formatting.fontFamily} onChange={handleFontFamilyChange}>
        {systemFonts.map((font, index) => (
          <option key={index} value={font} style={{ fontFamily: font }}>
            {font}
          </option>
        ))}
      </select>
      <Divider sx={{ height: "1rem", margin: "4px", padding: "4px", borderColor: "#ccc", alignSelf: "center" }} orientation="vertical" flexItem />
      <div className={styles["font-size-controls"]}>
        <button onClick={handleIncreaseFontSize} title="Increase character size" className={styles["font-size-button"]}>
          <span className="material-symbols-outlined">add</span>
        </button>
        <input
          type="text"
          className={styles["font-size-input"]}
          value={inputFontSize}
          onChange={(e) => {
            if (/^\d*$/.test(e.target.value)) {
              setInputFontSize(e.target.value);
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
        <button onClick={handleDecreaseFontSize} title="Decrease character size" className={styles["font-size-button"]}>
          <span className="material-symbols-outlined">remove</span>
        </button>
      </div>
      <Divider sx={{ height: "1rem", margin: "4px", padding: "4px", borderColor: "#ccc", alignSelf: "center" }} orientation="vertical" flexItem />
      <button
        onClick={() => toggleBold(activeEditor)}
        className={`toolbar-button ${formatting.bold ? "active" : ""}`}
        aria-pressed={formatting.bold}
      >
        <span className={`material-symbols-outlined ${formatting.bold ? "filled" : ""}`}>format_bold</span>
      </button>
      <button
        onClick={() => toggleItalic(activeEditor)}
        className={`toolbar-button ${formatting.italic ? "active" : ""}`}
        aria-pressed={formatting.italic}
      >
        <span className={`material-symbols-outlined ${formatting.italic ? "filled" : ""}`}>format_italic</span>
      </button>
      <button
        onClick={() => toggleUnderline(activeEditor)}
        className={`toolbar-button ${formatting.underline ? "active" : ""}`}
        aria-pressed={formatting.underline}
      >
        <span className="material-symbols-outlined">format_underlined</span>
      </button>
      <div className={styles["toolbar-item"]}>
        <FormatTextColor
          onSelect={(color) => {
            setTextColor(color);
            handleTextFormatColor(color);
          }}
          FormatTextColorInputRef={textColorInputRef}
          FormatTextColor={formatting.textColor}
        />
      </div>
      <div className={styles["toolbar-item"]}>
        <HighlightColor
          onSelect={(color) => {
            setHighlightColor(color);
            handleHighlight(color);
          }}
          highlightColorInputRef={highlightColorInputRef}
          highlightColor={formatting.highlight}
        />
      </div>
      <Divider sx={{ height: "1rem", margin: "4px", padding: "4px", borderColor: "#ccc", alignSelf: "center" }} orientation="vertical" flexItem />
      <button onClick={() => activeEditor?.chain().focus().toggleBlockquote().run()} className={activeEditor?.isActive("blockquote") ? "active" : ""}>
        <span className="material-symbols-outlined">history_edu</span>
      </button>
      <button disabled onClick={() => activeEditor?.chain().focus().toggleBlockquote().run()} className={activeEditor?.isActive("blockquote") ? "active" : ""}>
        <span className="material-symbols-outlined">functions</span>
      </button>
      {/* <div className="toolbar-item alignment-button">
        <button onClick={(e) => { e.stopPropagation(); setShowAlignmentMenu(!showAlignmentMenu); }}>
          <span className="material-symbols-outlined">{getCurrentAlignmentIcon()}</span>
        </button>
      </div> */}
      <button className={formatting.isBlockquote ? "active" : ""} onClick={() => activeEditor?.chain().focus().toggleBlockquote().run()}>
        <span className="material-symbols-outlined">format_quote</span>
      </button>
      <Divider sx={{ height: "1rem", margin: "4px", padding: "4px", borderColor: "#ccc", alignSelf: "center" }} orientation="vertical" flexItem />
      <button
        onClick={(e) => addCommentFromSelection(e)}
        className={selectedText ? "active" : ""}
        disabled={!activeEditor || (activeEditor.state.selection.from === activeEditor.state.selection.to)}
        title="Add comment to selected text"
      >
        <span className="material-symbols-outlined">add_comment</span>
      </button>
      <button disabled className={formatting.isOrderedList ? "active" : ""} onClick={() => activeEditor?.chain().focus().toggleOrderedList().run()}>
        <span className="material-symbols-outlined">bookmark</span>
      </button>
      <button disabled onClick={() => activeEditor?.chain().focus().toggleBlockquote().run()} className={formatting.isBulletList ? "active" : ""}>
        <span className="material-symbols-outlined">add_link</span>
      </button>
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
