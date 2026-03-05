import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Download,
  Eye,
  Share2,
  MoreHorizontal,
  Copy,
  Trash2,
  PenLine,
} from "lucide-react";
import {
  AppButton,
  AppDropdownMenu,
  AppDropdownMenuContent,
  AppDropdownMenuItem,
  AppDropdownMenuSeparator,
  AppDropdownMenuTrigger,
} from "@/components/app";
import {
  TextEditor,
  type TextEditorElement,
} from "@/components/editor/TextEditor";
import { useTaskSubmit } from "../hooks/useTaskSubmit";
import { subscribeToTask } from "../services/taskEventBus";
import type { TaskSnapshot } from "../services/taskEventBus";
import { debounce } from "lodash";

const ContentPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [isTrashing, setIsTrashing] = useState(false);

  const editorRef = useRef<TextEditorElement>(null);

  const task = useTaskSubmit<{ prompt: string }>("agent-text-continuation", {
    prompt: `The city had changed in ways no one expected. Buildings that once stood tall now leaned awkwardly against the sky, their facades cracked like ancient pottery. People still walked the streets, but their steps carried a different weight.

<<INSERT_HERE>>

By evening, the lamplighters had given up trying. The old gas lamps flickered once, twice, then surrendered to the dark. Only the moon remained reliable, casting its indifferent glow over the rooftops.`
,
  });

  const stateRef = useRef({ title, content });
  stateRef.current = { title, content };

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    setLoaded(false);
    setTitle("");
    setContent("");

    async function load() {
      try {
        const output = await window.workspace.loadOutput({
          type: "writings",
          id: id!,
        });
        if (cancelled || !output) {
          if (!cancelled) setLoaded(true);
          return;
        }

        setTitle(output.metadata.title || "");
        setContent(output.content || "");
        setLoaded(true);
      } catch {
        if (!cancelled) setLoaded(true);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const debouncedSave = useMemo(
    () =>
      debounce(() => {
        if (!id || !loaded) return;
        const { title: t, content: c } = stateRef.current;
        window.workspace.updateOutput({
          type: "writings",
          id,
          content: c,
          metadata: { title: t },
        });
      }, 1500, { leading: false, trailing: true }),
    [id, loaded]
  );

  useEffect(() => {
    return () => {
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

  const { charCount, wordCount } = useMemo(() => {
    const trimmed = content.trim();
    const chars = trimmed.length;
    const words =
      trimmed.length === 0 ? 0 : trimmed.split(/\s+/).filter(Boolean).length;
    return { charCount: chars, wordCount: words };
  }, [content]);

  const handleTitleChange = useCallback((value: string) => {
    setTitle(value);
    debouncedSave();
  }, [debouncedSave]);

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    debouncedSave();
  }, [debouncedSave]);

  const handleMoveToTrash = useCallback(async () => {
    if (!id || isTrashing) return;

    setIsTrashing(true);

    debouncedSave.cancel();

    try {
      await window.workspace.trashOutput({ type: "writings", id });
      navigate("/home");
    } catch (err) {
      console.error("[ContentPage] Failed to trash writing:", err);
      setIsTrashing(false);
    }
  }, [id, isTrashing, navigate, debouncedSave]);

  useEffect(() => {
    if (!task.taskId) return;
    const unsub = subscribeToTask(task.taskId, (snap: TaskSnapshot) => {
      editorRef.current?.insertText(snap.streamedContent, { preventEditorUpdate: false });
    });
    return unsub;
  }, [task.taskId]);

  const handleContinueWithAI = useCallback((content: string, positionFrom: number) => {
    task.submit({ prompt: content + "<<INSERT_HERE>>" }, { metadata: { positionFrom } });
  }, [task]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-8 py-5 border-b border-border shrink-0">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <PenLine className="h-4 w-4 text-blue-500 shrink-0" />
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder={t("writing.titlePlaceholder")}
            className="text-xl font-semibold text-foreground bg-transparent border-none outline-none placeholder:text-muted-foreground/50 w-full min-w-0"
          />
        </div>
        <div className="flex items-center gap-3 ml-4 shrink-0">
          <AppDropdownMenu>
            <AppDropdownMenuTrigger asChild>
              <AppButton
                type="button"
                variant="outline"
                size="icon"
                title={t("common.moreOptions")}
              >
                <MoreHorizontal className="h-4 w-4" />
              </AppButton>
            </AppDropdownMenuTrigger>
            <AppDropdownMenuContent align="end">
              <AppDropdownMenuItem>
                <Eye className="h-4 w-4" />
                {t("common.preview")}
              </AppDropdownMenuItem>
              <AppDropdownMenuItem>
                <Download className="h-4 w-4" />
                {t("common.download")}
              </AppDropdownMenuItem>
              <AppDropdownMenuItem>
                <Share2 className="h-4 w-4" />
                {t("common.share")}
              </AppDropdownMenuItem>
              <AppDropdownMenuSeparator />
              <AppDropdownMenuItem>
                <Copy className="h-4 w-4" />
                {t("common.duplicate")}
              </AppDropdownMenuItem>
              <AppDropdownMenuItem
                className="text-destructive focus:text-destructive"
                disabled={isTrashing}
                onClick={handleMoveToTrash}
              >
                <Trash2 className="h-4 w-4" />
                {t("common.moveToTrash")}
              </AppDropdownMenuItem>
            </AppDropdownMenuContent>
          </AppDropdownMenu>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-background">
        <div className="w-full max-w-4xl mx-auto px-10 py-10 flex flex-col gap-2">
          {loaded && (
            <TextEditor
              ref={editorRef}
              key={id}
              value={content}
              onChange={handleContentChange}
              onContinueWithAI={handleContinueWithAI}
            />
          )}
        </div>
      </div>

      <div className="shrink-0 flex items-center justify-end px-8 py-2 border-t border-border">
        <span className="text-xs text-muted-foreground">
          {t("writing.charactersAndWords", {
            chars: charCount,
            words: wordCount,
          })}
        </span>
      </div>
    </div>
  );
};

export default ContentPage;
