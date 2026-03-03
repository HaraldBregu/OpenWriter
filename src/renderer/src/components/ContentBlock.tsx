import React, { useCallback, useEffect, useRef, useState } from "react";
import { Reorder, useDragControls } from "framer-motion";
import { TextEditor } from "@/components/app/editor/TextEditor";
import type { ContentBlockProps } from "@/components/block.types";

// ---------------------------------------------------------------------------
// ContentBlock Component
// ---------------------------------------------------------------------------

export const ContentBlock = React.memo(function ContentBlock({
  block,
  onChange,
  placeholder = "Type here...",
  autoFocus = false,
  onAddBelow,
  onDelete,
}: ContentBlockProps): React.JSX.Element {
  const dragControls = useDragControls();

  // ---------------------------------------------------------------------------
  // Stable refs — updated every render so the permanent subscription closure
  // always reads the latest values without being listed as a dep.
  // ---------------------------------------------------------------------------
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // ---------------------------------------------------------------------------
  // AI Enhancement — local state per block instance.
  // ---------------------------------------------------------------------------
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string | undefined>(
    undefined,
  );
  const originalTextRef = useRef<string>("");
  const accumulatedAiContentRef = useRef<string>("");
  // Holds the final content after completion until block.content catches up.
  const pendingFinalContentRef = useRef<string | null>(null);

  // Once block.content matches the pending final content, safe to clear streamingContent.
  useEffect(() => {
    if (
      pendingFinalContentRef.current !== null &&
      block.content === pendingFinalContentRef.current
    ) {
      pendingFinalContentRef.current = null;
      setStreamingContent(undefined);
    }
  }, [block.content]);

  // Single permanent subscription tied to block.id.
  // Receives all IPC task events and filters to those matching this block's taskId.
  useEffect(() => {
    if (typeof window.task?.onEvent !== "function") return;

    const unsub = window.task.onEvent((event) => {
      const data = event.data as { taskId?: string };
      if (data?.taskId !== block.id) return;

      switch (event.type) {
        case "stream": {
          const sd = event.data as { data: string };
          accumulatedAiContentRef.current += sd.data;
          setStreamingContent(originalTextRef.current + accumulatedAiContentRef.current);
          break;
        }
        case "completed": {
          const cd = event.data as {
            result?: { content?: string };
            durationMs?: number;
          };
          // Use authoritative result from server; fall back to client accumulation.
          const aiOutput =
            cd.result?.content ?? accumulatedAiContentRef.current;
          const finalContent = originalTextRef.current + aiOutput;
          // Propagate final content via the onChange callback so parent state is updated.
          pendingFinalContentRef.current = finalContent;
          onChangeRef.current(block.id, finalContent);
          accumulatedAiContentRef.current = "";
          setStreamingContent(finalContent);
          setIsEnhancing(false);
          break;
        }
        case "error":
        case "cancelled":
          pendingFinalContentRef.current = null;
          accumulatedAiContentRef.current = "";
          originalTextRef.current = "";
          setStreamingContent(undefined);
          setIsEnhancing(false);
          break;
      }
    });

    return unsub;
  }, [block.id]); // permanent — only re-subscribes if block gets a new UUID

  // Adapt AppTextEditor's (value: string) => void to ContentBlock's (id, content) => void
  const handleChange = useCallback(
    (content: string) => onChange(block.id, content),
    [onChange, block.id],
  );

  // Adapt AppTextEditor's (pos: number) => void to ContentBlock's (id: string) => void.
  // The ProseMirror `pos` is intra-editor and not meaningful outside the editor;
  // ContentBlock identifies itself to the parent by block.id instead.
  const handleAddBelow = useCallback(() => {
    onAddBelow?.(block.id);
  }, [onAddBelow, block.id]);

  const handleDelete = useCallback(() => {
    onDelete?.(block.id);
  }, [onDelete, block.id]);

  return (
    <Reorder.Item
      value={block}
      dragListener={false}
      dragControls={dragControls}
      className="group relative cursor-default select-none"
      style={{ zIndex: 1 }}
    >
      <AppTextEditor
        value={block.content}
        onChange={handleChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        disabled={isEnhancing}
        streamingContent={streamingContent}
        className={isEnhancing ? "opacity-60" : undefined}
        onAddBelow={handleAddBelow}
        onDelete={handleDelete}
      />
    </Reorder.Item>
  );
});
ContentBlock.displayName = "ContentBlock";
