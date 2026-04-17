import React from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { ImageView } from '../../views/image';

export function ImageNodeView(props: NodeViewProps): React.JSX.Element {
	return (
		<NodeViewWrapper contentEditable={false} className="my-4">
			<ImageView nodeViewProps={props} />
		</NodeViewWrapper>
	);
}
