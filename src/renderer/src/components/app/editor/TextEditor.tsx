import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useEditor, EditorContent, type UseEditorOptions } from "@tiptap/react";
import type { Editor, AnyExtension } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Text from "@tiptap/extension-text";
import Paragraph from "@tiptap/extension-paragraph";
import Heading from "@tiptap/extension-heading";
import History from "@tiptap/extension-history";
import Bold from "@tiptap/extension-bold";
import Italic from "@tiptap/extension-italic";
import Underline from "@tiptap/extension-underline";
import Strike from "@tiptap/extension-strike";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import ListItem from "@tiptap/extension-list-item";
import { cn } from "@/lib/utils";
import {
  BlockControls,
  GUTTER_WIDTH,
  type HoveredBlock,
} from "./BlockControls";
import { BlockActions } from "./BlockActions";
import { BubbleMenu } from "./bubble-menu";
import { OptionMenu } from "./option-menu";
import { PromptInput } from "./prompt-input";
import { Placeholder } from "@tiptap/extensions";
import {
  MarkdownSerializer,
  MarkdownParser,
  defaultMarkdownSerializer,
} from "prosemirror-markdown";
import type { Node as ProseMirrorNode, Mark } from "@tiptap/pm/model";
import MarkdownIt from "markdown-it";

// ---------------------------------------------------------------------------
// Markdown serializer/deserializer mapped to Tiptap's node/mark names.
//
// prosemirror-markdown's defaultMarkdownSerializer uses snake_case names from
// prosemirror-schema-basic (e.g. bullet_list, ordered_list, list_item, code_block,
// hard_break). Tiptap uses camelCase names for the same concepts. We remap them
// here so the serializer walks Tiptap's document tree correctly.
// ---------------------------------------------------------------------------

type NodeSerializerFn = (
  state: InstanceType<typeof import("prosemirror-markdown").MarkdownSerializerState>,
  node: ProseMirrorNode,
  parent: ProseMirrorNode,
  index: number,
) => void;

type MarkSerializerSpec = {
  open:
    | string
    | ((
        state: InstanceType<typeof import("prosemirror-markdown").MarkdownSerializerState>,
        mark: Mark,
        parent: ProseMirrorNode,
        index: number,
      ) => string);
  close:
    | string
    | ((
        state: InstanceType<typeof import("prosemirror-markdown").MarkdownSerializerState>,
        mark: Mark,
        parent: ProseMirrorNode,
        index: number,
      ) => string);
  mixable?: boolean;
  expelEnclosingWhitespace?: boolean;
  escape?: boolean;
};

// Pull the well-tested node handlers out of the default serializer and alias
// them under Tiptap's camelCase names.
const defaultNodes = defaultMarkdownSerializer.nodes as Record<
  string,
  NodeSerializerFn
>;
const defaultMarks = defaultMarkdownSerializer.marks as Record<
  string,
  MarkSerializerSpec
>;

const tiptapMarkdownSerializer = new MarkdownSerializer(
  {
    // Block nodes — Tiptap camelCase → prosemirror-markdown handlers
    blockquote: defaultNodes.blockquote,
    codeBlock: defaultNodes.code_block,
    heading: defaultNodes.heading,
    horizontalRule: defaultNodes.horizontal_rule,
    bulletList: defaultNodes.bullet_list,
    orderedList: defaultNodes.ordered_list,
    listItem: defaultNodes.list_item,
    paragraph: defaultNodes.paragraph,
    image: defaultNodes.image,
    hardBreak: defaultNodes.hard_break,
    text: defaultNodes.text,
    // Inline nodes that Tiptap wraps as nodes rather than marks
    doc(state, node) {
      state.renderContent(node);
    },
  },
  {
    // Mark specs — names match Tiptap's mark names
    bold: defaultMarks.strong,
    italic: defaultMarks.em,
    strike: {
      open: "~~",
      close: "~~",
      mixable: true,
      expelEnclosingWhitespace: true,
    },
    underline: {
      // Markdown has no underline syntax; fall back to HTML <u> so round-trips
      // do not silently drop underline formatting.
      open: "<u>",
      close: "</u>",
      mixable: true,
    },
    code: {
      open(_state, _mark, parent, index) {
        return backticksFor(parent.child(index), -1);
      },
      close(_state, _mark, parent, index) {
        return backticksFor(parent.child(index - 1), 1);
      },
      escape: false,
    },
    link: defaultMarks.link,
  },
);

/** Mirrors the backticksFor helper used inside prosemirror-markdown. */
function backticksFor(node: ProseMirrorNode, side: -1 | 1): string {
  const ticks = /`+/g;
  let m: RegExpExecArray | null;
  let len = 0;
  if (node.isText) {
    while ((m = ticks.exec(node.text!)) !== null) {
      len = Math.max(len, m[0].length);
    }
  }
  let result = len > 0 && side > 0 ? " `" : "`";
  for (let i = 0; i < len; i++) result += "`";
  if (len > 0 && side < 0) result += " ";
  return result;
}

// ---------------------------------------------------------------------------
// markdown-it instance configured to match CommonMark + GFM strikethrough.
// ---------------------------------------------------------------------------
const md = new MarkdownIt("commonmark").enable("strikethrough");

// ---------------------------------------------------------------------------
// Token map for the Tiptap-compatible MarkdownParser.
//
// Defined as a plain object so it can be reused across calls without
// constructing a MarkdownParser at module level (the constructor requires a
// live schema and crashes when passed null).
// ---------------------------------------------------------------------------

const TIPTAP_TOKEN_MAP = {
  blockquote: { block: "blockquote" },
  paragraph: { block: "paragraph" },
  list_item: { block: "listItem" },
  bullet_list: { block: "bulletList" },
  ordered_list: { block: "orderedList", getAttrs: (tok: import("markdown-it/lib/token.mjs").default) => ({ start: +(tok.attrGet("start") ?? 1) }) },
  heading: { block: "heading", getAttrs: (tok: import("markdown-it/lib/token.mjs").default) => ({ level: +tok.tag.slice(1) }) },
  code_block: { block: "codeBlock", noCloseToken: true },
  fence: { block: "codeBlock", getAttrs: (tok: import("markdown-it/lib/token.mjs").default) => ({ language: tok.info || "" }), noCloseToken: true },
  hr: { node: "horizontalRule" },
  image: {
    node: "image",
    getAttrs: (tok: import("markdown-it/lib/token.mjs").default) => ({
      src: tok.attrGet("src"),
      title: tok.attrGet("title") || null,
      alt: (tok.children as Array<{ content: string }> | null)?.[0]?.content || null,
    }),
  },
  hardbreak: { node: "hardBreak" },
  em: { mark: "italic" },
  strong: { mark: "bold" },
  s: { mark: "strike" },
  link: {
    mark: "link",
    getAttrs: (tok: import("markdown-it/lib/token.mjs").default) => ({
      href: tok.attrGet("href"),
      title: tok.attrGet("title") || null,
    }),
  },
  code_inline: { mark: "code" },
};

/**
 * Parse a markdown string into a Tiptap-compatible ProseMirror document JSON.
 * Returns null when the input is empty so callers can fall back to a blank doc.
 */
function markdownToTiptapJSON(
  schema: import("@tiptap/pm/model").Schema,
  markdown: string,
): import("@tiptap/pm/model").Node | null {
  if (!markdown || !markdown.trim()) return null;
  try {
    // Only include token entries whose target node/mark exists in this schema,
    // so adding/removing extensions never causes "Unknown node type" errors.
    const filteredTokenMap = Object.fromEntries(
      Object.entries(TIPTAP_TOKEN_MAP).filter(([, spec]) => {
        if ("block" in spec) return spec.block in schema.nodes;
        if ("node" in spec) return spec.node in schema.nodes;
        if ("mark" in spec) return spec.mark in schema.marks;
        return false;
      }),
    );
    const parser = new MarkdownParser(schema, md, filteredTokenMap);
    return parser.parse(markdown);
  } catch (err) {
    console.error("[TextEditor] markdown parse error:", err);
    return null;
  }
}

/**
 * Serialize a Tiptap editor's current document to a markdown string.
 */
function tiptapDocToMarkdown(doc: ProseMirrorNode): string {
  try {
    return tiptapMarkdownSerializer.serialize(doc, { tightLists: true });
  } catch (err) {
    console.error("[TextEditor] markdown serialize error:", err);
    return "";
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  disabled?: boolean;
  id?: string;
  streamingContent?: string;
  onContinueWithAI?: (content: string) => void;
}

// ---------------------------------------------------------------------------
// Base extensions
// ---------------------------------------------------------------------------

const BASE_EXTENSIONS: AnyExtension[] = [
  Document,
  Text,
  Paragraph,
  Heading.configure({ levels: [1, 2, 3, 4, 5, 6] }),
  History,
  Bold,
  Italic,
  Underline,
  Strike,
  BulletList,
  OrderedList,
  ListItem,
  Placeholder.configure({
    placeholder: ({ node }) => {
      if (node.type.name === 'paragraph') {
        return "Type '/' for commands, or press 'space' for AI assistance\u2026";
      }
      if (node.type.name === 'heading') {
        return `Heading ${node.attrs.level}`;
      }
      return '';
    },
  }),
];

// ---------------------------------------------------------------------------
// EditorAdapter — owns the Tiptap editor instance.
// ---------------------------------------------------------------------------

function EditorAdapter({
  value,
  onChange,
  autoFocus,
  disabled,
  streamingContent,
  onContinueWithAI,
  forwardedRef,
}: {
  value: string;
  onChange: (value: string) => void;
  autoFocus: boolean | undefined;
  disabled: boolean | undefined;
  streamingContent: string | undefined;
  onContinueWithAI: ((content: string) => void) | undefined;
  forwardedRef: React.Ref<HTMLDivElement>;
}): React.JSX.Element {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const internalChangeRef = useRef(false);

  // Capture the initial value so onCreate can parse it as markdown.
  const initialValueRef = useRef(value);

  const editorOptions = useMemo<UseEditorOptions>(
    () => ({
      extensions: BASE_EXTENSIONS,
      content: "",
      immediatelyRender: false,
      onCreate: ({ editor: ed }: { editor: Editor }) => {
        const initial = initialValueRef.current;
        if (!initial) return;
        const doc = markdownToTiptapJSON(ed.schema, initial);
        if (doc) {
          ed.commands.setContent(doc.toJSON(), { emitUpdate: false });
        }
      },
      onUpdate: ({ editor: ed }: { editor: Editor }) => {
        internalChangeRef.current = true;
        onChangeRef.current(tiptapDocToMarkdown(ed.state.doc));
      },
      editorProps: {
        attributes: {
          class:
            "focus:outline-none min-h-[120px] py-2 text-base leading-relaxed text-foreground break-words [&_p]:mb-4 [&_p:last-child]:mb-0",
        },
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const editor = useEditor(editorOptions, []);

  // Sync external value changes into the editor.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;

    if (streamingContent !== undefined) {
      // Streaming content arrives as markdown; parse before setting.
      const doc = markdownToTiptapJSON(editor.schema, streamingContent);
      const current = tiptapDocToMarkdown(editor.state.doc);
      if (current !== streamingContent) {
        if (doc) {
          editor.commands.setContent(doc.toJSON(), {
            emitUpdate: false,
            parseOptions: { preserveWhitespace: "full" },
          });
        } else {
          editor.commands.setContent("", { emitUpdate: false });
        }
      }
      return;
    }

    if (internalChangeRef.current) {
      internalChangeRef.current = false;
      return;
    }

    // External value (markdown) changed — parse and set.
    const current = tiptapDocToMarkdown(editor.state.doc);
    const incoming = value || "";
    if (current !== incoming) {
      const doc = markdownToTiptapJSON(editor.schema, incoming);
      if (doc) {
        editor.commands.setContent(doc.toJSON(), {
          emitUpdate: false,
          parseOptions: { preserveWhitespace: "full" },
        });
      } else {
        editor.commands.setContent("", { emitUpdate: false });
      }
    }
  }, [value, streamingContent, editor]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  const didAutoFocus = useRef(false);
  useEffect(() => {
    if (didAutoFocus.current || !autoFocus || !editor || editor.isDestroyed)
      return;
    didAutoFocus.current = true;
    Promise.resolve().then(() => {
      if (!editor.isDestroyed) editor.commands.focus("start");
    });
  }, [editor, autoFocus]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredBlock, setHoveredBlock] = useState<HoveredBlock | null>(null);

  // Resolve the top-level block at a given clientY.
  const getBlock = useCallback(
    (y: number): { dom: HTMLElement; pos: number } | null => {
      if (!editor) return null;
      const pm = containerRef.current?.querySelector(
        ".ProseMirror",
      ) as HTMLElement | null;
      if (!pm) return null;
      for (const child of Array.from(pm.children) as HTMLElement[]) {
        const r = child.getBoundingClientRect();
        if (y >= r.top - 4 && y <= r.bottom + 4) {
          try {
            const p = editor.view.posAtDOM(child, 0);
            return { dom: child, pos: editor.state.doc.resolve(p).before(1) };
          } catch {
            return null;
          }
        }
      }
      return null;
    },
    [editor],
  );

  // Mouse move / leave — detect hovered block.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onMove = (e: MouseEvent): void => {
      const block = getBlock(e.clientY);
      if (block) {
        const cR = el.getBoundingClientRect();
        const bR = block.dom.getBoundingClientRect();
        const lh = parseFloat(getComputedStyle(block.dom).lineHeight) || 30;
        setHoveredBlock({
          node: block.dom,
          pos: block.pos,
          top: bR.top - cR.top + Math.min(lh, bR.height) / 2 - 12,
        });
      } else {
        setHoveredBlock(null);
      }
    };

    const onLeave = (): void => {
      setTimeout(() => {
        setHoveredBlock(null);
      }, 80);
    };

    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [getBlock]);

  return (
    <div className="relative w-full" ref={forwardedRef}>
      <div
        ref={containerRef}
        className="relative"
        style={{ paddingLeft: GUTTER_WIDTH, paddingRight: GUTTER_WIDTH }}
      >
        {editor && (
          <>
            <BlockControls
              editor={editor}
              containerRef={containerRef}
              hoveredBlock={hoveredBlock}
            />
            <BlockActions
              editor={editor}
              containerRef={containerRef}
              hoveredBlock={hoveredBlock}
            />
            <BubbleMenu editor={editor} />
            <OptionMenu editor={editor} onContinueWithAI={onContinueWithAI} />
            <PromptInput
              editor={editor}
              containerRef={containerRef}
              onSubmit={(prompt, _pos) =>
                console.log("PromptInput submit:", prompt)
              }
            />
          </>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TextEditor — public API, memoised outer shell.
// ---------------------------------------------------------------------------

const TextEditor = React.memo(
  React.forwardRef<HTMLDivElement, TextEditorProps>((props, ref) => {
    const {
      value,
      onChange,
      autoFocus,
      className,
      disabled,
      id,
      onContinueWithAI,
    } = props;

    const stableOnChange = useCallback(
      (markdown: string) => onChange(markdown),
      [onChange],
    );

    return (
      <div id={id} className={cn("w-full", className)}>
        <EditorAdapter
          value={value}
          onChange={stableOnChange}
          autoFocus={autoFocus}
          disabled={disabled}
          forwardedRef={ref}
          streamingContent={props.streamingContent}
          onContinueWithAI={onContinueWithAI}
        />
      </div>
    );
  }),
);
TextEditor.displayName = "TextEditor";

export { TextEditor };
