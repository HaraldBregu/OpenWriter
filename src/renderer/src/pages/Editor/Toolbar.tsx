import React, { MouseEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import HighlightColor from "../../components/highlight-color";
import FormatTextColor from "../../components/format-text-color";
import CustomSelect from "@/components/ui/custom-select";

// @ts-ignore
import { DEFAULT_LINE_SPACING, fontSizes, fontSizesPt, sectionTypes } from "../../utils/optionsEnums";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"


import Bold from "@/components/icons/Bold";
import Italic from "@/components/icons/Italic";
import Underline from "@/components/icons/Underline";
import Restore from "@/components/icons/Restore";
import HistoryEdu from "@/components/icons/HistoryEdu";
import Siglum from "@/components/icons/Siglum";
import CommentAdd from "@/components/icons/CommentAdd";
import Bookmark from "@/components/icons/Bookmark";
import LinkAdd from "@/components/icons/LinkAdd";
import Divider from "@/components/ui/divider";
import Button from "@/components/ui/button";
import Citation from "@/components/icons/Citation";
import Undo from "@/components/icons/Undo";
import DockToRight from "@/components/icons/DockToRight";
import AlignLeft from "@/components/icons/AlignLeft";
import AlignRight from "@/components/icons/AlignRight";
import AlignCenter from "@/components/icons/AlignCenter";
import AlignJustify from "@/components/icons/AlignJustify";
import List from "@/components/icons/List";
import FormatLineSpacing from "@/components/icons/FormatLineSpacing";
import Dropdown from "@/components/icons/Dropdown";
import { cn } from "@/lib/utils";
import IndentDecrease from "@/components/icons/IndentDecrease";
import IndentIncrease from "@/components/icons/IndentIncrease";
import Search from "@/components/icons/Search";
import Print from "@/components/icons/Print";
import ListNumber from "@/components/icons/ListNumber";
import ListUppercase from "@/components/icons/ListUppercase";
import ListLowercase from "@/components/icons/ListLowercase";
import ListBullet from "@/components/icons/ListBullet";
import ListBullet_empty from "@/components/icons/ListBullet_empty";
import Superscript from "@/components/icons/Superscript";
import Subscript from "@/components/icons/Subscript";
import NonPrintingCharact from "@/components/icons/NonPrintingCharact";
import { Label } from "../../components/ui/label";
import { useWindowSize } from "@/hooks/use-window";
import useHasInProgressAnimation from "@/hooks/use-has-in-progress-animation";
import { useIpcRenderer } from "@/hooks/use-ipc-renderer";
import ListSquareBullet from "../../components/icons/ListSquareBullet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import ReadingSeperator from "@/components/icons/ReadingSeperator";
import Symbol from "@/components/icons/Symbol";
import Object from "@/components/icons/Object";
import ReadingType from "@/components/icons/ReadingType";
import { useSidebar } from "@/components/ui/sidebar";

export const ToolbarContainer = ({ className, children }: { children: React.ReactNode, className: string }) => {
  return (
    <header className={cn("flex h-9 shrink-0 items-center gap-2 border-b bg-background overflow-hidden max-w-full", className)}>
      <div className="flex items-center gap-2 px-1 flex-1 overflow-hidden max-w-full">
        {children}
      </div>
    </header>
  )
}

interface ToolbarProps {
  editorIsFocused: boolean;
  emphasisState: EmphasisState;
  onEmphasisStateChange: (emphasisState: EmphasisState) => void;
  onHeadingLevelChange: (headingLevel: number) => void;
  onSetBody: (style?: Style) => void;
  onFontFamilyChange: (fontFamily: string) => void;
  onFontSizeChange: (fontSize: string) => void;
  onBoldChange: (bold: boolean) => void;
  onItalicChange: (italic: boolean) => void;
  onUnderlineChange: (underline: boolean) => void;
  onTextColorChange: (textColor: string) => void;
  onHighlightColorChange: (highlightColor: string) => void;
  onSetBlockquote: (blockquote: boolean) => void;
  onSetTextAlignment: (alignment: string) => void;
  onSetLineSpacing: (spacing: Spacing) => void;
  onSetListStyle: (style: BulletStyle) => void;
  onSetSuperscript: (superscript: boolean) => void;
  onSetSubscript: (subscript: boolean) => void;

  viewToolbar: boolean;
  includeOptionals?: string[];
  history?: HistoryState;
  canUndo: boolean;
  onUndo: (historyAction?: HistoryAction) => void;
  onRedo: () => void;
  bookmarksCategories: BookmarkCategory[];
  bookmarkActive: boolean;
  onClickAddBookmark: (category?: string) => void;
  onUnsetBookmark: () => void;
  canAddBookmark: boolean;
  commentCategories: CommentCategory[];
  commentActive: boolean;
  canAddComment: boolean;
  onClickAddComment: (categoryId?: string) => void;
  onUnsetComment: () => void;
  editorMode: 'editing' | 'review';
  setEditorMode: (mode: 'editing' | 'review') => void;
  onIncreaseIndent: () => void;
  onDecreaseIndent: () => void;
  onShowCustomSpacing: () => void;
  onShowResumeNumbering: () => void;
  continuePreviousNumbering: () => void;
  headingEnabled?: boolean;
  toggleNonPrintingCharacters: () => void;
  showCustomizeToolbar: () => void;
  styles: Style[]
  showAddSymbol: () => void;
  siglumList: Siglum[];
  onSelectSiglum: (siglum: Siglum) => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  editorIsFocused,
  emphasisState,
  onEmphasisStateChange,
  onHeadingLevelChange,
  onSetBody,
  onFontFamilyChange,
  onFontSizeChange,
  onBoldChange,
  onItalicChange,
  onUnderlineChange,
  onTextColorChange,
  onHighlightColorChange,
  onSetBlockquote,
  onSetTextAlignment,
  onSetLineSpacing,
  onSetListStyle,
  onSetSuperscript,
  onSetSubscript,

  viewToolbar,
  includeOptionals = [],
  history,
  canUndo,
  onUndo,
  onRedo,
  onClickAddComment,
  onUnsetComment,
  onClickAddBookmark,
  onUnsetBookmark,
  bookmarksCategories,
  bookmarkActive,
  editorMode,
  setEditorMode,
  canAddBookmark,
  commentCategories,
  commentActive,
  canAddComment,
  onIncreaseIndent,
  onDecreaseIndent,
  onShowCustomSpacing,
  onShowResumeNumbering,
  continuePreviousNumbering,
  headingEnabled = true,
  toggleNonPrintingCharacters,
  showCustomizeToolbar,
  styles,
  showAddSymbol,
  siglumList,
  onSelectSiglum,
}) => {
  const { t } = useTranslation();
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState<{
    top: number
    left?: number
    right?: number
  }>({ top: 0, left: 0 });

  const handleContextMenu = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const editorRect = event.currentTarget.getBoundingClientRect()
    const isNearRightEdge = (editorRect.left - event.clientX) / 2
    const top = event.clientY;

    if (isNearRightEdge) {
      const right = editorRect.right - event.clientX - 10; // 10px padding from the right edge
      setPopoverPosition({ top, right, left: undefined })
    } else {
      const left = event.clientX - editorRect.left;
      setPopoverPosition({ top, left, right: undefined })
    }
    setShowContextMenu(true);
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const retrieveActionDetail = (data: HistoryAction) => {
    const textContent = data.content
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<p.*?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim();
    return textContent
  }

  const toolbarContainer = useRef<HTMLDivElement>(null);

  const [alignmentWidth, setAlignmentWidth] = useState<number>(0);
  const [undoRedoWidth, setUndoRedoWidth] = useState<number>(0);
  const [sectionWidth, setSectionWidth] = useState<number>(0);
  const [fontFamilyWidth, setFontFamilyWidth] = useState<number>(0);
  const [fontSizeWidth, setFontSizeWidth] = useState<number>(0);
  const [fontStylingWidth, setFontStylingWidth] = useState<number>(0);
  const [spacingWidth, setSpacingWidth] = useState<number>(0);
  const [linkingWidth, setLinkingWidth] = useState<number>(0);
  const [findPreviewWidth, setFindPreviewWidth] = useState<number>(0);
  const [sidebarButtonWidth, setSidebarButtonWidth] = useState<number>(0);

  const alignmentGroupRef = useRef<HTMLDivElement>(null);
  const linkingGroupRef = useRef<HTMLDivElement>(null);
  const spacingGroupRef = useRef<HTMLDivElement>(null);
  const sidebarButtonRef = useRef<HTMLButtonElement>(null);
  const undoRedoGroupRef = useRef<HTMLDivElement>(null);
  const sectionGroupRef = useRef<HTMLDivElement>(null);
  const fontFamilyGroupRef = useRef<HTMLDivElement>(null);
  const fontSizeGroupRef = useRef<HTMLDivElement>(null);
  const fontStylingGroupRef = useRef<HTMLDivElement>(null);
  const findPreviewGroupRef = useRef<HTMLDivElement>(null);

  const { width: windowWidth } = useWindowSize();
  const hasInProgressAnimation = useHasInProgressAnimation();

  const [systemFonts, setSystemFonts] = useState<string[]>([]);

  const sidebar = useSidebar();

  const customStyleIdMap = new Map<string, number>();
  let nextCustomId = -1;

  function getStyleNumericId(
    style: string
  ): string {
    switch (style) {
      case "H1": return "1";
      case "H2": return "2";
      case "H3": return "3";
      case "H4": return "4";
      case "H5": return "5";
      case "H6": return "6";
      case "P": return "0";
      default: {
        // per CUSTOM o altri stili non standard
        if (!customStyleIdMap.has(style)) {
          customStyleIdMap.set(style, nextCustomId--); // assegna e decrementa
        }
        return customStyleIdMap.get(style)!.toString();
      }
    }
  }

  const stylesOptions = styles.map(({ name, type }) => ({ label: name, value: getStyleNumericId(type) }));


  // HANDLE IPC EVENTS
  useIpcRenderer((ipc) => {
    ipc.send('request-system-fonts');

    ipc.on('receive-system-fonts', (_: any, fonts: string[]) => {
      setSystemFonts(fonts)
    });

    return () => {
      ipc.off('receive-system-fonts');
    }

  }, [window.electron.ipcRenderer]);

  const hideGroups = () => {
    if (!toolbarContainer.current) return;

    let availableWidth = toolbarContainer.current.offsetWidth
      - undoRedoWidth
      - sectionWidth
      - spacingWidth
      - linkingWidth
      - sidebarButtonWidth;
    const groupWidths = [
      { width: fontStylingWidth, ref: fontStylingGroupRef },
      { width: fontSizeWidth, ref: fontSizeGroupRef },
      { width: fontFamilyWidth, ref: fontFamilyGroupRef },
      { width: findPreviewWidth, ref: findPreviewGroupRef },
      { width: alignmentWidth, ref: alignmentGroupRef },
    ];

    let hideFrom: number | null = null;
    for (const groupKey in groupWidths) {
      const { ref, width: groupWidth } = groupWidths[groupKey];

      if (availableWidth - groupWidth > 0) {
        availableWidth -= groupWidth;
        ref.current?.classList.remove("hidden");
      } else if (availableWidth - groupWidth <= 0) {
        hideFrom = parseInt(groupKey);
        break;
      }
    }
    if (hideFrom !== null) {
      for (let i = hideFrom; i < groupWidths.length; i++) {
        const { ref } = groupWidths[i];
        ref.current?.classList.add("hidden");
      }
    }
  }

  useEffect(() => {
    if (viewToolbar) {
      setTimeout(() => {
        hideGroups();
      }, 300);
    }
  }, [
    sidebar.open,
    windowWidth,
    hasInProgressAnimation,
    viewToolbar,
    alignmentWidth,
    undoRedoWidth,
    sectionWidth,
    fontFamilyWidth,
    fontSizeWidth,
    fontStylingWidth,
    spacingWidth,
    linkingWidth,
    findPreviewWidth,
    sidebarButtonWidth,
  ]);

  useEffect(() => {
    setAlignmentWidth((alignmentWidth) => {
      if (alignmentGroupRef.current?.offsetWidth) {
        const style = getComputedStyle(alignmentGroupRef.current);
        const gapWidth = parseInt(style.marginLeft || '0') + parseInt(style.marginRight || '0');
        return alignmentGroupRef.current?.offsetWidth + gapWidth;
      }
      return alignmentWidth;
    });
    setUndoRedoWidth((undoRedoWidth) => {
      if (undoRedoGroupRef.current?.offsetWidth) {
        const style = getComputedStyle(undoRedoGroupRef.current);
        const gapWidth = parseInt(style.marginLeft || '0') + parseInt(style.marginRight || '0');
        return undoRedoGroupRef.current?.offsetWidth + gapWidth;
      }
      return undoRedoWidth;
    });
    setSectionWidth((sectionWidth) => {
      if (sectionGroupRef.current?.offsetWidth) {
        const style = getComputedStyle(sectionGroupRef.current);
        const gapWidth = parseInt(style.marginLeft || '0') + parseInt(style.marginRight || '0');
        return sectionGroupRef.current?.offsetWidth + gapWidth;
      }
      return sectionWidth;
    });
    setFontFamilyWidth((fontFamilyWidth) => {
      if (fontFamilyGroupRef.current?.offsetWidth) {
        const style = getComputedStyle(fontFamilyGroupRef.current);
        const gapWidth = parseInt(style.marginLeft || '0') + parseInt(style.marginRight || '0');
        return fontFamilyGroupRef.current?.offsetWidth + gapWidth;
      }
      return fontFamilyWidth;
    });
    setFontSizeWidth((fontSizeWidth) => {
      if (fontSizeGroupRef.current?.offsetWidth) {
        const style = getComputedStyle(fontSizeGroupRef.current);
        const gapWidth = parseInt(style.marginLeft || '0') + parseInt(style.marginRight || '0');
        return fontSizeGroupRef.current?.offsetWidth + gapWidth;
      }
      return fontSizeWidth;
    });
    setFontStylingWidth((fontStylingWidth) => {
      if (fontStylingGroupRef.current?.offsetWidth) {
        const style = getComputedStyle(fontStylingGroupRef.current);
        const gapWidth = parseInt(style.marginLeft || '0') + parseInt(style.marginRight || '0');
        return fontStylingGroupRef.current?.offsetWidth + gapWidth;
      }
      return fontStylingWidth;
    });
    setSpacingWidth((spacingWidth) => {
      if (spacingGroupRef.current?.offsetWidth) {
        const style = getComputedStyle(spacingGroupRef.current);
        const gapWidth = parseInt(style.marginLeft || '0') + parseInt(style.marginRight || '0');
        return spacingGroupRef.current?.offsetWidth + gapWidth;
      }
      return spacingWidth;
    });
    setLinkingWidth((linkingWidth) => {
      if (linkingGroupRef.current?.offsetWidth) {
        const style = getComputedStyle(linkingGroupRef.current);
        const gapWidth = parseInt(style.marginLeft || '0') + parseInt(style.marginRight || '0');
        return linkingGroupRef.current?.offsetWidth + gapWidth;
      }
      return linkingWidth;
    });
    setFindPreviewWidth((findPreviewWidth) => {
      if (findPreviewGroupRef.current?.offsetWidth) {
        const style = getComputedStyle(findPreviewGroupRef.current);
        const gapWidth = parseInt(style.marginLeft || '0') + parseInt(style.marginRight || '0');
        return findPreviewGroupRef.current?.offsetWidth + gapWidth;
      }
      return findPreviewWidth;
    });
    setSidebarButtonWidth((sidebarButtonWidth) => {
      if (sidebarButtonRef.current?.offsetWidth) {
        const style = getComputedStyle(sidebarButtonRef.current);
        const gapWidth = parseInt(style.marginLeft || '0') + parseInt(style.marginRight || '0');
        return sidebarButtonRef.current?.offsetWidth + gapWidth;
      }
      return sidebarButtonWidth;
    });
    setTimeout(() => {
      hideGroups();
    }, 500);
  }, [toolbarContainer, includeOptionals]);

  return (
    <ToolbarContainer className={viewToolbar ? '' : 'hidden'}>
      <div ref={toolbarContainer} onContextMenu={handleContextMenu} className={cn("relative w-full max-w-full flex justify-between space-x-2 overflow-hidden")}>
        <div
          style={{
            position: "absolute",
            top: `${popoverPosition.top}px`,
            left: popoverPosition.left !== undefined ? `${popoverPosition.left}px` : undefined,
            right: popoverPosition.right !== undefined ? `${popoverPosition.right}px` : undefined,
            width: "1px",
            height: "1px",
            pointerEvents: "none",
          }}
        >
          <Popover open={showContextMenu} onOpenChange={setShowContextMenu}>
            <PopoverTrigger asChild>
              <div className="w-1 h-1" />
            </PopoverTrigger>
            <PopoverContent className="w-auto px-2 py-1" onOpenAutoFocus={(e) => e.preventDefault()}>
              <div className="flex items-center gap-2">
                <Button
                  intent="secondary"
                  variant="icon"
                  size="small"
                  aria-label={t('toolbar.contextMenu')}
                  className="border-none shadow-none hover:bg-grey-80 focus-visible:ring-0 focus-visible:ring-offset-0"
                  onClick={() => {
                    setShowContextMenu(false)
                    showCustomizeToolbar();
                  }}
                >
                  {t('toolbar.contextMenu')}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex items-center space-x-2 flex-nowrap">
          <Button
            variant="icon"
            size="iconSm"
            aria-label="Show/hide Sidebar"
            ref={sidebarButtonRef}
            onClick={() => {
              sidebar.toggleSidebar();
            }}
            tabIndex={1}
            tooltip={t('toolbar.sidebar.toggle')}
            className={`border-none shadow-none hover:bg-grey-80 focus-visible:ring-0 focus-visible:ring-offset-0 transition-transform duration-300`}
          >
            <DockToRight variant="tonal" intent="secondary" size="small" />
          </Button>
          <div
            ref={undoRedoGroupRef}
            className={`flex items-center space-x-2 transition-transform duration-300`}
          >
            <Divider className="px-0" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild className="p-0 m-0">
                <Button
                  intent="secondary"
                  variant="outline"
                  size="mini"
                  aria-label="undo"
                  tabIndex={2}
                  tooltip={t('toolbar.undo')}
                  className="border-none shadow-none gap-0 hover:bg-grey-80 focus-visible:ring-0 focus-visible:ring-offset-0 px-[0] py-[0]"
                  disabled={canUndo && (!history?.recentActions || history?.recentActions?.length <= 0)}
                  leftIcon={<Undo inheritColor={true} intent='secondary' variant='tonal' size='small' />}
                  rightIcon={<Dropdown inheritColor={true} intent='secondary' variant='tonal' size='small' />}
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 !-top-6">
                <DropdownMenuLabel>
                  {t('editor.history')}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {history?.recentActions.map((action: HistoryAction) => (
                  <DropdownMenuItem key={action.id} onClick={() => {
                    onUndo(action)
                  }}>
                    <div className="flex flex-col">
                      <span>{action.description}</span>
                      <span>{retrieveActionDetail(action)}</span>
                      <span>{formatTime(action.timestamp)}</span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* REDO */}
            <Button
              intent="secondary"
              variant="icon"
              aria-label="redo"
              tabIndex={3}
              tooltip={t('toolbar.redo')}
              className="border-none shadow-none hover:bg-grey-80 focus-visible:ring-0 focus-visible:ring-offset-0 ml-[0!important]"
              size="iconSm"
              icon={<Restore intent='secondary' variant='tonal' size='small' />}
              onClick={onRedo}
            />
          </div>

          {/* HEADING SELECT */}
          <div
            ref={sectionGroupRef}
            className={`flex items-center space-x-2 transition-transform duration-300`}
          >
            <Divider className="px-0" />
            <CustomSelect
              disabled={!headingEnabled}
              value={emphasisState.headingLevel?.toString() || ''}
              onValueChange={(value) => {
                if (value > '0') {
                  onHeadingLevelChange(+value)
                  onEmphasisStateChange({
                    ...emphasisState,
                    headingLevel: +value
                  })
                } else if (value === '0') {
                  onEmphasisStateChange({
                    ...emphasisState,
                    headingLevel: +value
                  })
                  onSetBody()
                } else {
                  const selected = stylesOptions.find(option => option.value === value);
                  const label = selected?.label ?? null;
                  const selectedStyle = styles.find(s => s.name === label);

                  onEmphasisStateChange({
                    ...emphasisState,
                    headingLevel: +value
                  })

                  onSetBody(selectedStyle)
                }
              }}
              ariaLabel="Select text style"
              tooltip={t('toolbar.headingStyle')}
              tabIndex={4}
              triggerClassName="min-w-[91px]"
              showSeparators={true}
              items={stylesOptions}
            />
          </div>
          {/* FONT FAMILY SELECT */}
          <div
            ref={fontFamilyGroupRef}
            className={`flex items-center space-x-2 transition-transform duration-300`}
          >
            <Divider className="px-0" />
            <CustomSelect
              minWidth="150px"
              value={emphasisState.fontFamily ?? 'Times New Roman'}
              onValueChange={(value) => {
                onFontFamilyChange(value)
                onEmphasisStateChange({
                  ...emphasisState,
                  fontFamily: value
                })
              }}
              ariaLabel="Font Family"
              tooltip={t('toolbar.fontFamily')}
              tabIndex={5}
              triggerClassName="min-w-[140px]"
              placeholder={emphasisState.fontFamily}
              items={systemFonts.map(font => ({
                value: font,
                label: <span style={{ fontFamily: font }}>{font}</span>,
                style: { fontFamily: font }
              }))}
            />
          </div>
          {/* FONT SIZE SELECT */}
          <div
            ref={fontSizeGroupRef}
            className={`flex items-center space-x-2 transition-transform duration-300`}
          >
            <Divider className="px-0" />
            <CustomSelect
              // disabled={emphasisState.headingLevel > 0}
              value={emphasisState.fontSize?.replace('pt', '') ?? ''}
              onValueChange={(value) => {
                onFontSizeChange(`${value}pt`)
                onEmphasisStateChange({
                  ...emphasisState,
                  fontSize: `${value}pt`
                })
              }}
              tooltip={t('toolbar.fontSize')}
              ariaLabel="Font size"
              tabIndex={6}
              triggerClassName="min-w-[45px]"
              placeholder={emphasisState.fontSize}
              items={fontSizes.map(size => ({
                value: size.toString(),
                label: size
              }))}
            />
          </div>
          <div
            ref={fontStylingGroupRef}
            className={`flex items-center space-x-2 transition-transform duration-300`}
          >
            <Divider className="px-0" />
            {/* Superscript CONTROL */}
            {
              includeOptionals.includes('superscript') &&
              <Button
                intent="secondary"
                variant={emphasisState.superscript ? "tonal" : "icon"}
                aria-label="Superscript"
                size="iconSm"
                tabIndex={7}
                tooltip={t('toolbar.superscript')}
                icon={<Superscript intent='secondary' variant='tonal' size='small' />}
                onClick={() => {
                  onSetSuperscript(!emphasisState.superscript)
                  onEmphasisStateChange({
                    ...emphasisState,
                    superscript: !emphasisState.superscript
                  })
                }}
                aria-pressed={emphasisState.superscript}
                className="border-none shadow-none hover:bg-grey-80 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            }
            {/* Subscript CONTROL */}
            {
              includeOptionals.includes('subscript') &&
              <Button
                intent="secondary"
                variant={emphasisState.subscript ? "tonal" : "icon"}
                size="iconSm"
                tabIndex={8}
                tooltip={t('toolbar.subscript')}
                icon={<Subscript intent='secondary' variant='tonal' size='small' />}
                onClick={() => {
                  onSetSubscript(!emphasisState.subscript)
                  onEmphasisStateChange({
                    ...emphasisState,
                    subscript: !emphasisState.subscript
                  })
                }}
                aria-pressed={emphasisState.subscript}
                aria-label="Subscript"
                className="border-none shadow-none hover:bg-grey-80 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            }
            {/* BOLD CONTROL */}
            <Button
              intent="secondary"
              variant={emphasisState.bold ? "tonal" : "icon"}
              size="iconSm"
              tabIndex={9}
              tooltip={t('toolbar.bold')}
              icon={<Bold intent='secondary' variant='tonal' size='small' />}
              onClick={() => {
                onBoldChange(!emphasisState.bold)
                onEmphasisStateChange({
                  ...emphasisState,
                  bold: !emphasisState.bold
                })
              }}
              aria-pressed={emphasisState.bold}
              aria-label="Bold"
              className="border-none shadow-none hover:bg-grey-80 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            {/* ITALIC CONTROL */}
            <Button
              intent="secondary"
              variant={emphasisState.italic ? "tonal" : "icon"}
              size="iconSm"
              tabIndex={10}
              tooltip={t('toolbar.italic')}
              icon={<Italic intent='secondary' variant='tonal' size='small' />}
              onClick={() => {
                onItalicChange(!emphasisState.italic)
                onEmphasisStateChange({
                  ...emphasisState,
                  italic: !emphasisState.italic
                })
              }}
              aria-pressed={emphasisState.italic}
              aria-label="Italic"
              className="border-none shadow-none hover:bg-grey-80 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            {/* UNDERLINE CONTROL */}
            <Button
              intent="secondary"
              variant={emphasisState.underline ? "tonal" : "icon"}
              size="iconSm"
              tabIndex={11}
              tooltip={t('toolbar.underline')}
              icon={<Underline intent='secondary' variant='tonal' size='small' />}
              onClick={() => {
                onUnderlineChange(!emphasisState.underline)
                onEmphasisStateChange({
                  ...emphasisState,
                  underline: !emphasisState.underline
                })
              }}
              aria-pressed={emphasisState.underline}
              aria-label="Underline"
              className="border-none shadow-none hover:bg-grey-80 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            {/* TEXT COLOR CONTROL */}
            <FormatTextColor
              onSelect={(color) => {
                onTextColorChange(color)
                onEmphasisStateChange({
                  ...emphasisState,
                  textColor: color
                })
              }}
              tabIndex={12}
              tooltip={t('toolbar.fontColor')}
              ariaLabel="Text Color"
              textColor={emphasisState.textColor}
            />
            {/* HIGHLIGHT COLOR CONTROL */}
            <HighlightColor
              onSelect={(color) => {
                onHighlightColorChange(color)
                onEmphasisStateChange({
                  ...emphasisState,
                  highlight: color
                })
              }}
              tabIndex={13}
              tooltip={t('toolbar.highlightColor')}
              ariaLabel="Highlight Color"
              highlightColor={emphasisState.highlight}
            />
            {/* Non printing character CONTROL */}
            {
              includeOptionals.includes('nonprinting') &&
              <Button
                intent="secondary"
                variant={emphasisState.showNonPrintingCharacters ? "tonal" : "icon"}
                size="iconSm"
                tabIndex={14}
                tooltip={t('toolbar.nonPrintingCharacters')}
                icon={<NonPrintingCharact intent='secondary' variant='tonal' size='small' />}
                onClick={toggleNonPrintingCharacters}
                aria-pressed={false}
                aria-label="Non printing character"
                className="border-none shadow-none hover:bg-grey-80 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            }
          </div>
          <div
            ref={spacingGroupRef}
            className={`flex items-center space-x-2 transition-transform duration-300`}
          >
            <Divider className="px-0" />
            <Button
              intent="secondary"
              variant={emphasisState.blockquote ? "tonal" : "icon"}
              size="iconSm"
              tabIndex={15}
              tooltip={t('toolbar.note')}
              icon={<HistoryEdu intent='secondary' variant='tonal' size='small' />}
              onClick={() => {
                onSetBlockquote(!emphasisState.blockquote)
                onEmphasisStateChange({
                  ...emphasisState,
                  blockquote: !emphasisState.blockquote
                })
              }}
              aria-pressed={emphasisState.blockquote}
              aria-label="Blockquote"
              className="border-none shadow-none hover:bg-grey-80 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  intent="secondary"
                  variant="icon"
                  size="iconSm"
                  tabIndex={16}
                  tooltip={t('toolbar.siglum')}
                  icon={<Siglum
                    intent='secondary'
                    variant='tonal'
                    size='small'
                    disabled={siglumList.length === 0}
                  />}
                  onClick={() => null}
                  aria-label={t('toolbar.siglum')}
                  className="border-none shadow-none hover:bg-grey-80 focus-visible:ring-0 focus-visible:ring-offset-0"
                  disabled={siglumList.length === 0}
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-40">
                {siglumList.map((item) => (
                  <DropdownMenuItem
                    key={item.id}
                    onClick={() => {
                      onSelectSiglum(item)
                    }}>
                    {item.siglum.value}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              intent="secondary"
              variant="icon"
              size="iconSm"
              tabIndex={17}
              tooltip={t('toolbar.citation')}
              icon={<Citation intent='secondary' variant='tonal' size='small' />}
              onClick={() => {
                // TODO: add toggle citation
                // activeEditor?.chain().focus().toggleBlockquote().run()
              }}
              aria-label={t('toolbar.citation')}
              className="border-none shadow-none hover:bg-grey-80 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            {
              includeOptionals.includes('readingType') &&
              <Button
                intent="secondary"
                variant="icon"
                size="iconSm"
                tabIndex={17}
                tooltip={t('toolbar.readingType')}
                icon={<ReadingType intent='secondary' variant='tonal' size='small' />}
                onClick={() => {
                  // TODO: add toggle citation
                  // activeEditor?.chain().focus().toggleBlockquote().run()
                }}
                aria-label={t('toolbar.readingType')}
                className="border-none shadow-none hover:bg-grey-80 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            }
            {
              includeOptionals.includes('readingSeparator') &&
              <Button
                intent="secondary"
                variant="icon"
                size="iconSm"
                tabIndex={17}
                tooltip={t('toolbar.readingSeperator')}
                icon={<ReadingSeperator intent='secondary' variant='tonal' size='small' />}
                onClick={() => {
                  // TODO: add toggle citation
                  // activeEditor?.chain().focus().toggleBlockquote().run()
                }}
                aria-label={t('toolbar.readingSeperator')}
                className="border-none shadow-none hover:bg-grey-80 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            }
          </div>
          <div
            ref={linkingGroupRef}
            className={`flex items-center space-x-2 transition-transform duration-300`}
          >
            <Divider className="px-0" />
            {/* COMMENT ADD */}
            {(commentCategories.length === 0 || (commentActive && commentCategories.length > 0)) && <Button
              intent="secondary"
              variant={commentActive ? "tonal" : "icon"}
              size="iconSm"
              tabIndex={18}
              tooltip={t('toolbar.comment')}
              icon={<CommentAdd intent='secondary' variant='tonal' size='small' />}
              onClick={(_) => {
                if (commentActive) {
                  onUnsetComment()
                } else {
                  onClickAddComment()
                }
              }}
              aria-label="Insert comment"
              className="border-none shadow-none hover:bg-grey-80 focus-visible:ring-0 focus-visible:ring-offset-0"
            />}
            {!commentActive && commentCategories.length > 0 && <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  intent="secondary"
                  variant={commentActive ? "tonal" : "icon"}
                  size="iconSm"
                  tooltip={t('toolbar.comment')}
                  icon={<CommentAdd intent='secondary' variant='tonal' size='small' />}
                  disabled={!canAddComment}
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-40">
                <DropdownMenuItem
                  onClick={() => {
                    onClickAddComment()
                  }
                  }>Uncategorised
                </DropdownMenuItem>
                {commentCategories.map((category) => (
                  <DropdownMenuItem key={category.id} onClick={() => {
                    onClickAddComment(category.id)
                  }
                  }>
                    {category.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>}
            {/* BOOKMARK ADD */}
            {(bookmarksCategories.length === 0 || (bookmarkActive && bookmarksCategories.length > 0)) && <Button
              intent="secondary"
              variant={bookmarkActive ? "tonal" : "icon"}
              size="iconSm"
              tabIndex={19}
              tooltip={t('toolbar.bookmark')}
              icon={<Bookmark intent='secondary' variant="tonal" size='small' />}
              onClick={(_) => {
                if (bookmarkActive) {
                  onUnsetBookmark()
                } else {
                  onClickAddBookmark()
                }
              }}
              disabled={!canAddBookmark}
              aria-label="Insert bookmark"
              className="border-none shadow-none hover:bg-grey-80 focus-visible:ring-0 focus-visible:ring-offset-0"
            />}
            {!bookmarkActive && bookmarksCategories.length > 0 && <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  intent="secondary"
                  variant={bookmarkActive ? "tonal" : "icon"}
                  size="iconSm"
                  tooltip={t('toolbar.bookmark')}
                  icon={<Bookmark intent='secondary' variant='tonal' size='small' />}
                  disabled={!canAddBookmark}
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-40">
                <DropdownMenuItem
                  onClick={() => {
                    onClickAddBookmark()
                  }
                  }>Uncategorised
                </DropdownMenuItem>
                {bookmarksCategories.map((category) => (
                  <DropdownMenuItem key={category.id} onClick={() => {
                    onClickAddBookmark(category.id)
                  }
                  }>{category.name}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>}
            {
              includeOptionals.includes('symbol') &&
              <Button
                intent="secondary"
                variant="icon"
                size="iconSm"
                tabIndex={19}
                disabled={!editorIsFocused}
                aria-disabled={!editorIsFocused}
                tooltip={t('toolbar.symbol')}
                icon={<Symbol intent='secondary' variant='tonal' size='small' />}
                onClick={showAddSymbol}
              />
            }
            {/* LINK ADD */}
            <Button
              intent="secondary"
              variant="icon"
              size="iconSm"
              tabIndex={20}
              tooltip={t('toolbar.link')}
              icon={<LinkAdd intent='secondary' variant='tonal' size='small' />}
              onClick={() => {
                // TODO: add identified text
                //addIdentifiedText()
              }}
              aria-label="Insert link"
            />
            {
              includeOptionals.includes('object') &&
              <Button
                intent="secondary"
                variant="icon"
                size="iconSm"
                tabIndex={21}
                tooltip={t('toolbar.object')}
                icon={<Object intent='secondary' variant='tonal' size='small' />}
                onClick={() => {
                  // TODO: add object functionality
                }}
              />
            }
          </div>
          <div
            ref={alignmentGroupRef}
            className={`flex items-center space-x-2 transition-transform duration-300`}
          >
            <Divider className="px-0" />
            {/* Alignment */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button aria-label="Align text" tooltip={t('toolbar.alignment')} tabIndex={21} intent="secondary" variant="outline" size="mini" className="border-none shadow-none gap-0 focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-primary hover:text-white px-[.25rem] py-[0]"
                  leftIcon={
                    emphasisState.alignment === "left" ? <AlignLeft inheritColor={true} intent="secondary" variant="tonal" size="small" /> :
                      emphasisState.alignment === "center" ? <AlignCenter inheritColor={true} intent="secondary" variant="tonal" size="small" /> :
                        emphasisState.alignment === "right" ? <AlignRight inheritColor={true} intent="secondary" variant="tonal" size="small" /> :
                          <AlignJustify inheritColor={true} intent="secondary" variant="tonal" size="small" />
                  }
                  rightIcon={
                    <Dropdown inheritColor={true} intent='secondary' variant='tonal' size='small' />
                  }
                >
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent data-orientation='horizontal' className="flex space-x-2 p-1">
                <DropdownMenuItem tabIndex={22} className="p-0" onClick={() => {
                  onSetTextAlignment("left")
                  onEmphasisStateChange({
                    ...emphasisState,
                    alignment: "left"
                  })
                }}>
                  <Button
                    intent="secondary"
                    variant={emphasisState.alignment === 'left' ? "filled" : "icon"}
                    size="iconSm"
                    aria-label="Align Text Left"
                    tooltip={t('toolbar.alignLeft')}
                    icon={<AlignLeft intent='secondary' variant={emphasisState.alignment === 'left' ? "filled" : "icon"} size='small' />}
                  />
                </DropdownMenuItem>
                <DropdownMenuItem tabIndex={23} className="p-0" onClick={() => {
                  onSetTextAlignment("center")
                  onEmphasisStateChange({
                    ...emphasisState,
                    alignment: "center"
                  })
                }}>
                  <Button
                    intent="secondary"
                    variant={emphasisState.alignment === 'center' ? "filled" : "icon"}
                    size="iconSm"
                    aria-label="Align Text Center"
                    tooltip={t('toolbar.alignCenter')}
                    icon={<AlignCenter intent='secondary' variant={emphasisState.alignment === 'center' ? "filled" : "tonal"} size='small' />}
                  />
                </DropdownMenuItem>
                <DropdownMenuItem tabIndex={24} className="p-0" onClick={() => {
                  onSetTextAlignment("right")
                  onEmphasisStateChange({
                    ...emphasisState,
                    alignment: "right"
                  })
                }}>
                  <Button
                    intent="secondary"
                    variant={emphasisState.alignment === 'right' ? "filled" : "icon"}
                    size="iconSm"
                    aria-label="Align Text Right"
                    tooltip={t('toolbar.alignRight')}
                    icon={<AlignRight intent='secondary' variant={emphasisState.alignment === 'right' ? "filled" : "tonal"} size='small' />}
                  />
                </DropdownMenuItem>
                <DropdownMenuItem tabIndex={25} className="p-0" onClick={() => {
                  onSetTextAlignment("justify")
                  onEmphasisStateChange({
                    ...emphasisState,
                    alignment: "justify"
                  })
                }}>
                  <Button
                    intent="secondary"
                    variant={emphasisState.alignment === 'justify' ? "filled" : "icon"}
                    size="iconSm"
                    aria-label="Justify Text"
                    tooltip={t('toolbar.justify')}
                    icon={<AlignJustify intent='secondary' variant={emphasisState.alignment === 'justify' ? "filled" : "tonal"} size='small' />}
                  />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  intent="secondary"
                  variant="icon"
                  size="iconSm"
                  tabIndex={26}
                  tooltip={t('toolbar.spacing')}
                  icon={
                    <FormatLineSpacing intent="secondary" variant="tonal" size="small" />
                  }
                  onClick={() => null}
                  aria-label="Spacing"
                  className="border-none shadow-none hover:bg-grey-80 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-40">
                <DropdownMenuItem
                  onClick={() => {
                    onSetLineSpacing({
                      line: 1,
                      before: null,
                      after: null
                    })
                    onEmphasisStateChange({
                      ...emphasisState,
                      spacing: {
                        line: 1,
                        before: null,
                        after: null
                      }
                    })
                  }
                  }>{t('menu.format.text.spacing.single')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    onSetLineSpacing({
                      line: 1.15,
                      before: null,
                      after: null
                    })
                    onEmphasisStateChange({
                      ...emphasisState,
                      spacing: {
                        line: 1.15,
                        before: null,
                        after: null
                      }
                    })
                  }
                  }>{t('menu.format.text.spacing.1_15')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    onSetLineSpacing({
                      line: 1.5,
                      before: null,
                      after: null
                    })
                    onEmphasisStateChange({
                      ...emphasisState,
                      spacing: {
                        line: 1.5,
                        before: null,
                        after: null
                      }
                    })
                  }
                  }>{t('menu.format.text.spacing.oneAndHalf')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    onSetLineSpacing({
                      line: 2,
                      before: null,
                      after: null
                    })
                    onEmphasisStateChange({
                      ...emphasisState,
                      spacing: {
                        line: 2,
                        before: null,
                        after: null
                      }
                    })
                  }
                  }>{t('menu.format.text.spacing.double')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onShowCustomSpacing}
                >
                  {t('customSpacing.title')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button aria-label="Insert bulleted list / Insert numbered list"
                  tabIndex={27}
                  intent="secondary"
                  variant={emphasisState.bulletStyle.type !== '' ? "tonal" : "icon"}
                  size="mini"
                  tooltip={t('toolbar.list')}
                  className="border-none shadow-none gap-0 focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-primary hover:text-white px-[.25rem] py-[0]"
                  leftIcon={
                    <List intent="secondary" inheritColor={true} variant={emphasisState.bulletStyle.type !== '' ? "tonal" : "icon"} size="small" />
                  }
                  rightIcon={
                    <Dropdown intent='secondary' inheritColor={true} variant={emphasisState.bulletStyle.type !== '' ? 'tonal' : "icon"} size='small' />
                  }
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="p-[.5rem]">
                <div className="flex items-center py-[.5rem] gap-3">
                  <DropdownMenuItem tabIndex={28} className="p-0" onClick={() => {
                    onSetListStyle({
                      ...emphasisState.bulletStyle,
                      style: emphasisState.bulletStyle.style === 'decimal' ? '' : 'decimal',
                      type: emphasisState.bulletStyle.style === 'decimal' ? '' : 'ORDER',
                      previousType: emphasisState.bulletStyle.type
                    })
                    onEmphasisStateChange({
                      ...emphasisState,
                      bulletStyle: {
                        style: emphasisState.bulletStyle.style === 'decimal' ? '' : 'decimal',
                        type: emphasisState.bulletStyle.style === 'decimal' ? '' : 'ORDER',
                        previousType: emphasisState.bulletStyle.type
                      }
                    })
                  }}>
                    <Button
                      intent="secondary"
                      variant={emphasisState.bulletStyle.style === 'decimal' ? "filled" : "icon"}
                      size="iconSm"
                      tooltip={t('toolbar.listNumber')}
                      icon={<ListNumber intent='secondary' variant={emphasisState.bulletStyle.style === 'decimal' ? "filled" : "tonal"} size='small' />}
                    />
                  </DropdownMenuItem>
                  <DropdownMenuItem tabIndex={29} className="p-0" onClick={() => {
                    onSetListStyle({
                      ...emphasisState.bulletStyle,
                      style: emphasisState.bulletStyle.style === 'upper-alpha' ? '' : "upper-alpha",
                      type: emphasisState.bulletStyle.style === 'upper-alpha' ? '' : 'ORDER',
                      previousType: emphasisState.bulletStyle.type
                    })
                    onEmphasisStateChange({
                      ...emphasisState,
                      bulletStyle: {
                        style: emphasisState.bulletStyle.style === 'upper-alpha' ? '' : "upper-alpha",
                        type: emphasisState.bulletStyle.style === 'upper-alpha' ? '' : 'ORDER',
                        previousType: emphasisState.bulletStyle.type
                      }
                    })
                  }}>
                    <Button
                      intent="secondary"
                      variant={emphasisState.bulletStyle.style === 'upper-alpha' ? "filled" : "icon"}
                      size="iconSm"
                      tooltip={t('toolbar.listUppercase')}
                      icon={<ListUppercase intent='secondary' variant={emphasisState.bulletStyle.style === 'upper-alpha' ? "filled" : "tonal"} size='small' />}
                    />
                  </DropdownMenuItem>
                  <DropdownMenuItem tabIndex={30} className="p-0" onClick={() => {
                    onSetListStyle({
                      ...emphasisState.bulletStyle,
                      style: emphasisState.bulletStyle.style === 'lower-alpha' ? '' : "lower-alpha",
                      type: emphasisState.bulletStyle.style === 'lower-alpha' ? '' : 'ORDER',
                      previousType: emphasisState.bulletStyle.type
                    })
                    onEmphasisStateChange({
                      ...emphasisState,
                      bulletStyle: {
                        style: emphasisState.bulletStyle.style === 'lower-alpha' ? '' : "lower-alpha",
                        previousType: emphasisState.bulletStyle.type,
                        type: emphasisState.bulletStyle.style === 'lower-alpha' ? '' : 'ORDER'
                      }
                    })
                  }}>
                    <Button
                      intent="secondary"
                      variant={emphasisState.bulletStyle.style === 'lower-alpha' ? "filled" : "icon"}
                      size="iconSm"
                      tooltip={t('toolbar.listLowercase')}
                      icon={<ListLowercase intent='secondary' variant={emphasisState.bulletStyle.style === 'lower-alpha' ? "filled" : "tonal"} size='small' />}
                    />
                  </DropdownMenuItem>
                  <DropdownMenuItem tabIndex={31} className="p-0" onClick={() => {
                    onSetListStyle({
                      ...emphasisState.bulletStyle,
                      style: emphasisState.bulletStyle.style === 'disc' ? '' : "disc",
                      type: emphasisState.bulletStyle.style === 'disc' ? '' : 'BULLET',
                      previousType: emphasisState.bulletStyle.type
                    })
                    onEmphasisStateChange({
                      ...emphasisState,
                      bulletStyle: {
                        style: emphasisState.bulletStyle.style === 'disc' ? '' : "disc",
                        previousType: emphasisState.bulletStyle.type,
                        type: emphasisState.bulletStyle.style === 'disc' ? '' : 'BULLET'
                      }
                    })
                  }}>
                    <Button
                      intent="secondary"
                      variant={emphasisState.bulletStyle.style === 'disc' ? "filled" : "icon"}
                      size="iconSm"
                      tooltip={t('toolbar.listBullet')}
                      icon={<ListBullet intent='secondary' variant={emphasisState.bulletStyle.style === 'disc' ? "filled" : "tonal"} size='small' />}
                    />
                  </DropdownMenuItem>
                  <DropdownMenuItem tabIndex={32} className="p-0" onClick={() => {
                    onSetListStyle({
                      ...emphasisState.bulletStyle,
                      style: emphasisState.bulletStyle.style === 'circle' ? '' : "circle",
                      type: emphasisState.bulletStyle.style === 'circle' ? '' : 'BULLET',
                      previousType: emphasisState.bulletStyle.type
                    })
                    onEmphasisStateChange({
                      ...emphasisState,
                      bulletStyle: {
                        style: emphasisState.bulletStyle.style === 'circle' ? '' : "circle",
                        previousType: emphasisState.bulletStyle.type,
                        type: emphasisState.bulletStyle.style === 'circle' ? '' : 'BULLET'
                      }
                    })
                  }}>
                    <Button
                      intent="secondary"
                      variant={emphasisState.bulletStyle.style === 'circle' ? "filled" : "icon"}
                      size="iconSm"
                      tooltip={t('toolbar.listBulletEmpty')}
                      icon={<ListBullet_empty intent='secondary' variant={emphasisState.bulletStyle.style === 'circle' ? "filled" : "tonal"} size='small' />}
                    />
                  </DropdownMenuItem>
                  <DropdownMenuItem tabIndex={32} className="p-0" onClick={() => {
                    onSetListStyle({
                      ...emphasisState.bulletStyle,
                      style: emphasisState.bulletStyle.style === 'square' ? '' : "square",
                      type: emphasisState.bulletStyle.style === 'square' ? '' : 'BULLET',
                      previousType: emphasisState.bulletStyle.type
                    })
                    onEmphasisStateChange({
                      ...emphasisState,
                      bulletStyle: {
                        style: emphasisState.bulletStyle.style === 'square' ? '' : "square",
                        previousType: emphasisState.bulletStyle.type,
                        type: emphasisState.bulletStyle.style === 'square' ? '' : 'BULLET'
                      }
                    })
                  }}>
                    <Button
                      intent="secondary"
                      variant={emphasisState.bulletStyle.style === 'square' ? "filled" : "icon"}
                      size="iconSm"
                      tooltip={t('toolbar.listBulletSquare')}
                      icon={<ListSquareBullet intent='secondary' variant={emphasisState.bulletStyle.style === 'square' ? "filled" : "tonal"} size='small' />}
                    />
                  </DropdownMenuItem>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={emphasisState.bulletStyle.style !== 'decimal'}
                  tabIndex={33} className="p-[.25rem]"
                  onClick={() => {
                    onShowResumeNumbering();
                  }}>
                  {t('resumeNumbering.title')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={emphasisState.bulletStyle.style !== 'decimal'}
                  tabIndex={34} className="p-[.25rem]"
                  onClick={() => {
                    continuePreviousNumbering();
                  }}>
                  {t('editor.bulletList.continuePreviousNumbering')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              intent="secondary"
              variant="icon"
              size="iconSm"
              tabIndex={35}
              tooltip={t('toolbar.decreaseIndent')}
              aria-label="Decrease Indent"
              className="border-none shadow-none hover:bg-grey-80 focus-visible:ring-0 focus-visible:ring-offset-0"
              icon={
                <IndentDecrease intent="secondary" variant="tonal" size="small" />
              }
              onClick={onDecreaseIndent}
            />
            <Button
              intent="secondary"
              variant="icon"
              size="iconSm"
              tabIndex={36}
              tooltip={t('toolbar.increaseIndent')}
              aria-label="Increase Indent"
              className="border-none shadow-none hover:bg-grey-80 focus-visible:ring-0 focus-visible:ring-offset-0"
              icon={
                <IndentIncrease intent="secondary" variant="tonal" size="small" />
              }
              onClick={onIncreaseIndent}
            />
          </div>
        </div>
        <div ref={findPreviewGroupRef} className={`flex items-center space-x-2 px-1 transition-transform duration-300`}>
          <Button
            variant="icon"
            size="iconSm"
            tabIndex={37}
            tooltip={t('toolbar.search')}
            aria-label="Find"
            className="border-none shadow-none hover:bg-grey-80 focus-visible:ring-0 focus-visible:ring-offset-0"
            icon={<Search intent='secondary' variant='tonal' size='small' />}
            onClick={() => null}
          />
          <Button
            variant="icon"
            size="iconSm"
            tabIndex={38}
            tooltip={t('toolbar.printPreview')}
            aria-label="Show/Hide Print Preview"
            className="border-none shadow-none hover:bg-grey-80 focus-visible:ring-0 focus-visible:ring-offset-0"
            icon={<Print intent='secondary' variant='tonal' size='small' />}
            onClick={() => null}
          />
          <Divider className="px-0" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button id="mode-button" aria-haspopup="listbox" aria-expanded="false" aria-controls="mode-list" tabIndex={39} className="border-none shadow-none gap-0 focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-primary hover:text-white" intent="secondary" variant="outline" size="mini"
                rightIcon={
                  <Dropdown inheritColor={true} intent='secondary' variant='tonal' size='small' />
                }
              >
                {t(`editor.mode.${editorMode}.label`)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent id="mode-list" role="listbox" className="w-56">
              <DropdownMenuCheckboxItem
                checked={editorMode === 'editing'}
                onCheckedChange={() => setEditorMode('editing')}
                className="items-start"
                tabIndex={40}
                role="option"
                aria-selected={editorMode === 'editing'}
                aria-label={t('editor.mode.editing.label')}
              >
                <Label>
                  <span className="text-grey-10">
                    {t('editor.mode.editing.label')}
                  </span>
                  <span className="flex text-grey-40">
                    {t('editor.mode.editing.info')}
                  </span>
                </Label>
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={editorMode === 'review'}
                onCheckedChange={() => setEditorMode('review')}
                className="items-start"
                tabIndex={41}
                role="option"
                aria-selected={editorMode === 'review'}
                aria-label={t('editor.mode.review.label')}
              >
                <Label>
                  <span className="text-grey-10">
                    {t('editor.mode.review.label')}
                  </span>
                  <span className="flex text-grey-40">
                    {t('editor.mode.review.info')}
                  </span>
                </Label>
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </ToolbarContainer>
  );
};

export default Toolbar;
