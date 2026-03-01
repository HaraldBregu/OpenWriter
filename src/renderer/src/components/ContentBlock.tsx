import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppDispatch } from "@/store";
import { updateBlockContent } from "@/store/writingItemsSlice";
import { Sparkles, Trash2, Plus, Copy, GripVertical } from "lucide-react";
import { Reorder, useDragControls } from "framer-motion";
import { AppButton } from "@/components/app";
import { AppTextEditor } from "@/components/app/AppTextEditor";
import type { ContentBlockProps } from "@/components/block.types";

// ---------------------------------------------------------------------------
// ActionButton
// ---------------------------------------------------------------------------

interface ActionButtonProps {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}

const ActionButton = React.memo(function ActionButton({
  title,
  onClick,
  disabled = false,
  children,
}: ActionButtonProps) {
  return (
    <AppButton
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      variant={"ghost"}
      size="icon"
      className={`h-6 w-6 rounded-none`}
    >
      {children}
    </AppButton>
  );
});
ActionButton.displayName = "ActionButton";

// ---------------------------------------------------------------------------
// ContentBlock Component
// ---------------------------------------------------------------------------

export const ContentBlock = React.memo(function ContentBlock({
  block,
  isOnly,
  isLast = false,
  onChange,
  onDelete,
  onAdd,
  entryId,
  placeholder = "Type here...",
  autoFocus = false,
}: ContentBlockProps): React.JSX.Element {
  const { t } = useTranslation();
  const dragControls = useDragControls();
  const dispatch = useAppDispatch();

  // ---------------------------------------------------------------------------
  // AI Enhancement — local state per block instance.
  // ---------------------------------------------------------------------------
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string | undefined>(
    undefined,
  );
  const originalTextRef = useRef<string>("");
  const accumulatedAiContentRef = useRef<string>("");
  // Holds the final content after completion until block.content catches up in Redux.
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
    if (typeof window.tasksManager?.onEvent !== "function") return;

    const unsub = window.tasksManager.onEvent((event) => {
      const data = event.data as { taskId?: string };
      if (data?.taskId !== block.id) return;

      switch (event.type) {
        case "stream": {
          const sd = event.data as { token: string; content: string };
          accumulatedAiContentRef.current = sd.content;
          setStreamingContent(originalTextRef.current + sd.content);
          break;
        }
        case "completed": {
          const cd = event.data as { result?: { content?: string } };
          // Use authoritative result from server; fall back to client accumulation.
          const aiOutput =
            cd.result?.content ?? accumulatedAiContentRef.current;
          const finalContent = originalTextRef.current + aiOutput;
          // Keep streamingContent = finalContent so TipTap doesn't revert to
          // stale block.content before Redux propagates. pendingFinalContentRef
          // tracks when to clear it once block.content has caught up.
          pendingFinalContentRef.current = finalContent;
          dispatch(
            updateBlockContent({
              entryId,
              blockId: block.id,
              content: finalContent,
            }),
          );
          accumulatedAiContentRef.current = "";
          setStreamingContent(finalContent);
          setIsEnhancing(false);
          break;
        }
        case "error":
        case "cancelled":
          pendingFinalContentRef.current = null;
          accumulatedAiContentRef.current = "";
          setStreamingContent(undefined);
          setIsEnhancing(false);
          break;
      }
    });

    return unsub;
  }, [block.id, dispatch, entryId]);

  const handleEnhanceClick = useCallback(async () => {
    if (isEnhancing) return;
    const text = block.content;
    if (!text.trim()) return;
    if (typeof window.tasksManager?.submit !== "function") return;

    originalTextRef.current = text;
    accumulatedAiContentRef.current = "";
    setIsEnhancing(true);

    try {
      const result = await window.tasksManager.submit(
        "ai-enhance",
        { text },
        { taskId: block.id },
      );
      if (!result.success) setIsEnhancing(false);
    } catch {
      setIsEnhancing(false);
    }
  }, [isEnhancing, block.id, block.content]);

  // Adapt AppTextEditor's (value: string) => void to ContentBlock's (id, content) => void
  const handleChange = useCallback(
    (content: string) => onChange(block.id, content),
    [onChange, block.id],
  );

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(block.content);
  }, [block.content]);

  return (
    <Reorder.Item
      value={block}
      dragListener={false}
      dragControls={dragControls}
      className="group relative px-5 py-4 cursor-default select-none"
      style={{ zIndex: 1 }}
    >
      <div className="flex items-start gap-3">
        {/* Left buttons group */}
        <div className="flex items-center gap-0.5 mt-2 group/buttons">
          {onAdd && (
            <AppButton
              type="button"
              onClick={() => onAdd(block.id)}
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 text-muted-foreground/20 hover:text-muted-foreground/50 opacity-100 group-hover/buttons:opacity-100 rounded-none"
            >
              <Plus className="h-4 w-4" />
            </AppButton>
          )}

          {/* Drag handle */}
          <AppButton
            type="button"
            onPointerDown={(e) => dragControls.start(e)}
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/20 hover:text-muted-foreground/50 opacity-100 group-hover/buttons:opacity-100 touch-none rounded-none"
          >
            <GripVertical className="h-4 w-4" />
          </AppButton>
        </div>

        {/* Content area */}
        <div className="flex-1 min-w-0">
          <AppTextEditor
            type="PARAGRAPH"
            value={block.content}
            onChange={handleChange}
            placeholder={placeholder}
            autoFocus={autoFocus}
            disabled={isEnhancing}
            streamingContent={streamingContent}
            className={isEnhancing ? "opacity-60" : undefined}
          />
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-0.5 opacity-50 group-hover:opacity-100 shrink-0 my-2">
          <ActionButton
            title={
              isEnhancing
                ? t("contentBlock.enhancing")
                : t("contentBlock.enhanceWithAI")
            }
            onClick={handleEnhanceClick}
            disabled={isEnhancing}
          >
            <Sparkles
              className={`h-3.5 w-3.5${isEnhancing ? " animate-pulse" : ""}`}
            />
          </ActionButton>
          <ActionButton title={t("contentBlock.copy")} onClick={handleCopy}>
            <Copy className="h-3.5 w-3.5" />
          </ActionButton>
          <ActionButton
            title={t("contentBlock.delete")}
            onClick={() => onDelete(block.id)}
            disabled={isOnly}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </ActionButton>
        </div>
      </div>

      {onAdd && !isLast && (
        <div
          className="group/add ml-[3.4rem] h-3 hover:h-8 transition-all duration-200 flex items-center justify-center rounded cursor-pointer bg-muted/2 hover:bg-muted/30"
          onClick={() => onAdd(block.id)}
        >
          <Plus className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover/add:opacity-100 transition-opacity duration-150" />
        </div>
      )}
    </Reorder.Item>
  );
});
ContentBlock.displayName = "ContentBlock";
