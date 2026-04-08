import type { RefObject, ReactElement } from 'react';
import { TextEditor, type TextEditorElement } from '@/components/editor/TextEditor';
import { AppEditorLayout } from '@/components/app/document/AppEditorLayout';
import type { Editor } from '@tiptap/core';
import type { ModelInfo } from '../../../../../shared/types';

interface EditorAreaProps {
	readonly loaded: boolean;
	readonly disabled: boolean;
	readonly editorRef: RefObject<TextEditorElement | null>;
	readonly content: string;
	readonly externalValueVersion: number;
	readonly documentId: string | undefined;
	readonly defaultTextModel: ModelInfo | undefined;
	readonly defaultImageModel: ModelInfo | undefined;
	readonly onTextModelChange: (model: ModelInfo) => void;
	readonly onImageModelChange: (model: ModelInfo) => void;
	readonly onEditorReady: (editor: Editor | null) => void;
	readonly onSelectionChange: (selection: { from: number; to: number } | null) => void;
	readonly onChange: (newContent: string) => void;
	readonly onContinueWithAssistant: (
		before: string,
		after: string,
		cursorPos: number,
		closeMenu: () => void
	) => void;
	readonly onGenerateTextSubmit: (prompt: string) => Promise<void>;
	readonly onGenerateImageSubmit: (prompt: string, files: File[]) => Promise<void>;
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
	defaultTextModel,
	defaultImageModel,
	onTextModelChange,
	onImageModelChange,
	onEditorReady,
	onSelectionChange,
	onChange,
	onContinueWithAssistant,
	onGenerateTextSubmit,
	onGenerateImageSubmit,
	onUndo,
	onRedo,
}: EditorAreaProps): ReactElement {
	return (
		<AppEditorLayout>
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
					defaultTextModel={defaultTextModel}
					defaultImageModel={defaultImageModel}
					onTextModelChange={onTextModelChange}
					onImageModelChange={onImageModelChange}
					onEditorReady={onEditorReady}
					onUndo={onUndo}
					onRedo={onRedo}
				/>
			)}
		</AppEditorLayout>
	);
}
