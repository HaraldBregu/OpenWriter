import React from 'react';
import { TextEditor, type TextEditorElement } from '@/components/editor/TextEditor';
import type { Editor } from '@tiptap/core';
import { ResizablePanel } from '@/components/ui/Resizable';

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

interface EditorResizablePanelProps {
	readonly documentId: string | undefined;
	readonly loaded: boolean;
	readonly content: string;
	readonly disabled: boolean;
	readonly editorRef: React.RefObject<TextEditorElement | null>;
	readonly onEditorReady: (editor: Editor | null) => void;
	readonly onContentChange: (newContent: string) => void;
	readonly onContinueWithAssistant: (before: string, after: string, cursorPos: number) => void;
	readonly onEnhanceWithAssistant: (selectedText: string, from: number, to: number) => void;
	readonly onTextSubmit: (
		before: string,
		after: string,
		cursorPos: number,
		input: string,
	) => void;
	readonly onImageSubmit: (prompt: string) => Promise<void>;
}

// ------------------------------------------------------------------
// Component
// ------------------------------------------------------------------

const EditorResizablePanel: React.FC<EditorResizablePanelProps> = ({
	documentId,
	loaded,
	content,
	disabled,
	editorRef,
	onEditorReady,
	onContentChange,
	onContinueWithAssistant,
	onEnhanceWithAssistant,
	onTextSubmit,
	onImageSubmit,
}) => {
	return (
		<ResizablePanel defaultSize="70%" minSize="40%">
			<div className="h-full flex flex-col min-w-0">
				<div className="flex-1 overflow-y-auto overflow-x-hidden bg-background">
					<div className="w-full max-w-4xl mx-auto px-10 py-10 flex flex-col gap-2">
						{loaded && (
							<TextEditor
								disabled={disabled}
								ref={editorRef}
								key={documentId}
								value={content}
								onChange={onContentChange}
								onContinueWithAssistant={onContinueWithAssistant}
								onEnhanceWithAssistant={onEnhanceWithAssistant}
								onTextSubmit={onTextSubmit}
								onImageSubmit={onImageSubmit}
								documentId={documentId}
								onEditorReady={onEditorReady}
							/>
						)}
					</div>
				</div>
			</div>
		</ResizablePanel>
	);
};

export default EditorResizablePanel;
