import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ESidebar } from "./ESidebar";
import { EFooter } from "./EFooter";
import { EditorContainer } from "@/components/editor-container";
import { EditorHeader } from "@/components/editor-header";
import { EditorContent } from "@/components/editor-content";
import { EContent } from "./EContent";
import { EHeader } from "./EHeader";
import { EditorFooter } from "@/components/editor-footer";
import { Editor, useEditor } from "@tiptap/react";
import { defaultEditorConfig } from "./utils/editorConfigs";
import { useEffect, useRef, useState } from "react";

export const ELayout = () => {
    const [activeEditor, setActiveEditor] = useState<Editor | null>(null);

    const textEditor = useEditor({
        ...defaultEditorConfig,
        onUpdate: () => setActiveEditor(textEditor)
    });

    const apparatusEditor = useEditor({
        ...defaultEditorConfig,
        onUpdate: () => setActiveEditor(apparatusEditor)
    });

    useEffect(() => {
        console.log(JSON.stringify(activeEditor?.getJSON()))
    }, [textEditor])

    const contentChildRef = useRef<any>();

    return (
        <SidebarProvider>
            <ESidebar />
            <SidebarInset>
                <EditorContainer>
                    <EditorHeader>
                        <EHeader
                            editor={activeEditor}
                            setActiveEditor={setActiveEditor}
                            onClickAddComment={() => {
                                contentChildRef.current?.addComment()
                            }}
                            onClickAddBookmark={(category?: string) => {
                                contentChildRef.current?.addBookmark(category)
                            }}
                        />
                    </EditorHeader>
                    <EditorContent>
                        <EContent ref={contentChildRef} />
                    </EditorContent>
                    <EditorFooter>
                        <EFooter />
                    </EditorFooter>
                </EditorContainer>
            </SidebarInset>
        </SidebarProvider>
    )
}