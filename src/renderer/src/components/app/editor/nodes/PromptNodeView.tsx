import React from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { Prompt } from '../../views/prompt/Prompt';

export function PromptNodeView(props: NodeViewProps): React.JSX.Element {
	return (
		<NodeViewWrapper contentEditable={false}>
			<Prompt nodeViewProps={props} />
		</NodeViewWrapper>
	);
}
