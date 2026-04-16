import React from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { Provider } from './content_generator/Provider';
import { CardNodeView } from './content_generator/CardNodeView';

export function ContentGeneratorNodeView(props: NodeViewProps): React.JSX.Element {
	return (
		<NodeViewWrapper contentEditable={false}>
			<Provider nodeViewProps={props}>
				<CardNodeView />
			</Provider>
		</NodeViewWrapper>
	);
}
