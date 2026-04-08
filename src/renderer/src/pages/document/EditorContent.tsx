import React, { useRef, useCallback, useImperativeHandle } from 'react';
import type { TextEditorElement } from '@/components/editor/TextEditor';
import type { Editor } from '@tiptap/core';
import { useEditorInstance } from './providers';
import { useDocumentDispatch, useAssistantTask } from './hooks';
import { EditorArea } from './components/EditorArea';

export interface EditorContentElement {
  setSearch: (query: string) => void;
  clearSearch: () => void;
}

interface EditorContentProps {
  readonly documentId: string | undefined;
  readonly loaded: boolean;
  readonly content: string;
  readonly externalValueVersion: number;
  readonly onChange: (newContent: string) => void;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
}

const EditorContent = React.forwardRef<EditorContentElement, EditorContentProps>(
  ({ documentId, loaded, content, externalValueVersion, onChange, onUndo, onRedo }, ref) => {
    const dispatch = useDocumentDispatch();
    const { setEditor } = useEditorInstance();
    const editorRef = useRef<TextEditorElement>(null);

    const { assistantIsRunning, handleGenerateTextSubmit, handleGenerateImageSubmit, handleContinueWithAssistant } =
      useAssistantTask(documentId, editorRef);

    useImperativeHandle(ref, () => ({
      setSearch: (query: string) => editorRef.current?.setSearch(query),
      clearSearch: () => editorRef.current?.clearSearch(),
    }));

    const handleEditorReady = useCallback(
      (editor: Editor | null) => {
        setEditor(editor);
      },
      [setEditor]
    );

    const handleSelectionChange = useCallback(
      (selection: { from: number; to: number } | null) => {
        dispatch({ type: 'EDITOR_SELECTION_CHANGED', selection });
      },
      [dispatch]
    );

    const handleContentChange = useCallback(
      (newContent: string) => {
        dispatch({ type: 'CONTENT_CHANGED', value: newContent });
        onChange(newContent);
      },
      [dispatch, onChange]
    );

    return (
      <EditorArea
        loaded={loaded}
        disabled={assistantIsRunning}
        editorRef={editorRef}
        content={content}
        externalValueVersion={externalValueVersion}
        documentId={documentId}
        onEditorReady={handleEditorReady}
        onSelectionChange={handleSelectionChange}
        onChange={handleContentChange}
        onContinueWithAssistant={handleContinueWithAssistant}
        onGenerateTextSubmit={handleGenerateTextSubmit}
        onGenerateImageSubmit={handleGenerateImageSubmit}
        onUndo={onUndo}
        onRedo={onRedo}
      />
    );
  }
);

EditorContent.displayName = 'EditorContent';

export default EditorContent;
