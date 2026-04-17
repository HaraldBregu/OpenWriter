import React from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { Placeholder } from '../../views/placeholder/Placeholder';

export function PlaceholderNodeView(props: NodeViewProps): React.JSX.Element {
	return (
		<NodeViewWrapper contentEditable={false}>
			<Placeholder nodeViewProps={props} />
		</NodeViewWrapper>
	);
}
