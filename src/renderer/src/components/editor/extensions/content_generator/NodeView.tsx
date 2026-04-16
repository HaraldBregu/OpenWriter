import React from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { Provider } from './Provider';
import { CardNodeView } from './CardNodeView';


export function NodeView(props: NodeViewProps): React.JSX.Element {
	return (
		<NodeViewWrapper contentEditable={false}>
			<Provider nodeViewProps={props}>
				<CardNodeView />
			</Provider>
		</NodeViewWrapper>
	);
}
