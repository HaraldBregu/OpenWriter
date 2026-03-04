import React, { createContext, useContext } from "react";
import type { Editor } from "@tiptap/core";

interface EditorContextValue {
  editor: Editor;
}

export const EditorContext = createContext<EditorContextValue | null>(null);

interface EditorProviderProps {
  editor: Editor;
  children: React.ReactNode;
}

export function EditorProvider({ editor, children }: EditorProviderProps): React.JSX.Element {
  return (
    <EditorContext.Provider value={{ editor }}>
      {children}
    </EditorContext.Provider>
  );
}

export function useEditorContext(): EditorContextValue {
  const ctx = useContext(EditorContext);
  if (!ctx) {
    throw new Error("useEditorContext must be used within an EditorProvider");
  }
  return ctx;
}
