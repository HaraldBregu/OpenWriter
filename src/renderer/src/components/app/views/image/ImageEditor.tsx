import React from 'react';
import { ImageEditorProvider } from './Provider';
import { ImageEditorView } from './View';
import type { EditMode } from './context/state';

export type { EditMode } from './context/state';

export interface ImageEditorProps {
	src: string;
	alt: string | null;
	initialMode?: EditMode;
	onSave: (dataUri: string) => void;
	onCancel: () => void;
}

export function ImageEditor(props: ImageEditorProps): React.JSX.Element {
	return (
		<ImageEditorProvider {...props}>
			<ImageEditorView />
		</ImageEditorProvider>
	);
}
