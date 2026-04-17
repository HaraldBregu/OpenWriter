import React from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { ContentGeneratorProvider } from './Provider';
import { CardNodeView } from './CardNodeView';

export function ContentGeneratorNodeView(props: NodeViewProps): React.JSX.Element {
	return (
		<NodeViewWrapper contentEditable={false}>
			<ContentGeneratorProvider nodeViewProps={props}>
				<CardNodeView />
			</ContentGeneratorProvider>
		</NodeViewWrapper>
	);
}
