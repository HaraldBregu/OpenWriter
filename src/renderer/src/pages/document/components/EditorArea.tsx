import type { RefObject } from 'react';
import { TextEditor, type TextEditorElement } from '@/components/editor/TextEditor';
import type { Editor } from '@tiptap/core';

interface EditorAreaProps {
  readonly loaded: boolean;
  readonly disabled: boolean;
  readonly editorRef: RefObject<TextEditorElement>;
  readonly content: string;
  readonly externalValueVersion: number;
  readonly documentId: string | undefined;
  readonly onEditorReady: (editor: Editor | null) => void;
  readonly onSelectionChange: (selection: { from: number; to: number } | null) => void;
  readonly onChange: (newContent: string) => void;
  readonly onContinueWithAssistant: (
    before: string,
    after: string,
    cursorPos: number,
    closeMenu: () => void
  ) => void;
  readonly onGenerateTextSubmit: (
    before: string,
    after: string,
    cursorPos: number,
    input: string
  ) => Promise<void>;
  readonly onGenerateImageSubmit: (
    before: string,
    after: string,
    cursorPos: number,
    input: string,
    files: File[]
  ) => Promise<void>;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
}

export function EditorArea({
  loaded,
  disabled,
  editorRef,
  content,
  externalValueVersion,
  documentId,
  onEditorReady,
  onSelectionChange,
  onChange,
  onContinueWithAssistant,
  onGenerateTextSubmit,
  onGenerateImageSubmit,
  onUndo,
  onRedo,
}: EditorAreaProps): JSX.Element {
  return (
    <div className="h-full min-w-0 flex flex-col">
      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-background">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-2 px-10 py-10">
          {loaded && (
            <TextEditor
              disabled={disabled}
              ref={editorRef}
              value={content}
              onSelectionChange={onSelectionChange}
              externalValueVersion={externalValueVersion}
              onChange={onChange}
              onContinueWithAssistant={onContinueWithAssistant}
              onGenerateTextSubmit={onGenerateTextSubmit}
              onGenerateImageSubmit={onGenerateImageSubmit}
              documentId={documentId}
              onEditorReady={onEditorReady}
              onUndo={onUndo}
              onRedo={onRedo}
            />
          )}
        </div>
      </div>
    </div>
  );
}
