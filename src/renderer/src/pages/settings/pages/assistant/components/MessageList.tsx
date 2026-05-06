import type { ReactElement } from 'react';
import type { AssistantMessage } from '../context/state';

interface MessageListProps {
	readonly messages: readonly AssistantMessage[];
}

export default function MessageList({ messages }: MessageListProps): ReactElement {
	if (messages.length === 0) {
		return (
			<div className="flex h-full items-center justify-center text-sm text-muted-foreground">
				Start a conversation with your assistant.
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-3 p-4">
			{messages.map((m) => (
				<div
					key={m.id}
					className={
						m.role === 'user'
							? 'self-end max-w-[80%] rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm'
							: 'self-start max-w-[80%] rounded-lg bg-muted px-3 py-2 text-sm'
					}
				>
					{m.content}
				</div>
			))}
		</div>
	);
}
