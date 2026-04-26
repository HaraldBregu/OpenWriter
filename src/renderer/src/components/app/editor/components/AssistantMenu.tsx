import React from 'react';
import { ArrowRight, FileText, Languages, Sparkles, SpellCheck, Wand2 } from 'lucide-react';
import type { Editor } from '@tiptap/core';
import { Button } from '@/components/ui/Button';
import type { AssistantAction } from '../context/context';

const ACTIONS: { action: AssistantAction; Icon: typeof Sparkles; label: string }[] = [
	{ action: 'improve', Icon: Wand2, label: 'Improve writing' },
	{ action: 'fix-grammar', Icon: SpellCheck, label: 'Fix grammar' },
	{ action: 'summarize', Icon: FileText, label: 'Summarize' },
	{ action: 'translate', Icon: Languages, label: 'Translate' },
	{ action: 'continue-writing', Icon: ArrowRight, label: 'Continue writing' },
];

export const AssistantMenu = React.memo(function AssistantMenu({
	editor,
	onAction,
}: {
	editor: Editor;
	onAction?: (action: AssistantAction, editor: Editor) => void;
}): React.JSX.Element {
	return (
		<div className="flex flex-col gap-0.5">
			{ACTIONS.map(({ action, Icon, label }) => (
				<Button
					key={action}
					variant="ghost"
					size="sm"
					className="justify-start w-full"
					onClick={() => onAction?.(action, editor)}
				>
					<Icon className="h-3.5 w-3.5" />
					{label}
				</Button>
			))}
		</div>
	);
});
