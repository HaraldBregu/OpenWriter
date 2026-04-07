import React from 'react';
import { TextEditor, type TextEditorElement } from '@/components/editor/TextEditor';
import type { Editor } from '@tiptap/core';
import type { AssistantAgentId } from '@/components/editor/extensions/assistant';

interface EditorContentProps {
	readonly loaded: boolean;
	readonly assistantIsRunning: boolean;
	readonly editorRef: React.RefObject<TextEditorElement>;
	readonly documentId: string | undefined;
	readonly content: string;
	readonly externalValueVersion: number;
	readonly onSelectionChange: (selection: { from: number; to: number } | null) => void;
	readonly onChange: (newContent: string) => void;
	readonly onContinueWithAssistant: (
		before: string,
		after: string,
		cursorPos: number,
		closeMenu: () => void
	) => void;
	readonly onTextSubmit: (
		before: string,
		after: string,
		cursorPos: number,
		input: string,
		agentId?: AssistantAgentId,
		files?: File[]
	) => Promise<void>;
	readonly onEditorReady: (editor: Editor | null) => void;
	readonly onUndo: () => void;
	readonly onRedo: () => void;
}

const EditorContent: React.FC<EditorContentProps> = ({
	loaded,
	assistantIsRunning,
	editorRef,
	documentId,
	content,
	externalValueVersion,
	onSelectionChange,
	onChange,
	onContinueWithAssistant,
	onTextSubmit,
	onEditorReady,
	onUndo,
	onRedo,
}) => {
	return (
		<div className="h-full min-w-0 flex flex-col">
			<div className="flex-1 overflow-y-auto overflow-x-hidden bg-background">
				<div className="mx-auto flex w-full max-w-4xl flex-col gap-2 px-10 py-10">
					{loaded && (
						<TextEditor
							disabled={assistantIsRunning}
							ref={editorRef}
							value={content}
							onSelectionChange={onSelectionChange}
							externalValueVersion={externalValueVersion}
							onChange={onChange}
							onContinueWithAssistant={onContinueWithAssistant}
							onTextSubmit={onTextSubmit}
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
};

export default EditorContent;
