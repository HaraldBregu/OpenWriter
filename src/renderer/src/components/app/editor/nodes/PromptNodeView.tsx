import React from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { CardNodeView } from '../../views/prompt/CardNodeView';
 
export function PromptNodeView(props: NodeViewProps): React.JSX.Element {
	return (
		<NodeViewWrapper contentEditable={false}>
			<CardNodeView nodeViewProps={props} />
		</NodeViewWrapper>
	);
}
