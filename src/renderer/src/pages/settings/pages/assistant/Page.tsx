import { useCallback, type ReactElement } from 'react';
import {
	PageContainer,
	PageHeader,
	PageHeaderTitle,
} from '@/components/app';
import { PageBody } from '@/components/app/base/page';
import Layout from './Layout';
import MessageList from './components/MessageList';
import Composer from './components/Composer';
import { useDispatch, useState } from './hooks';
import { sendMessage } from './services/assistant-service';
import { ASSISTANT_TITLE } from './shared';

function PageContent(): ReactElement {
	const { messages, input, isRunning } = useState();
	const dispatch = useDispatch();

	const handleInputChange = useCallback(
		(value: string) => {
			dispatch({ type: 'INPUT_CHANGED', value });
		},
		[dispatch]
	);

	const handleSubmit = useCallback(async () => {
		const trimmed = input.trim();
		if (!trimmed || isRunning) return;

		dispatch({
			type: 'MESSAGE_APPENDED',
			message: { id: crypto.randomUUID(), role: 'user', content: trimmed },
		});
		dispatch({ type: 'INPUT_CHANGED', value: '' });
		dispatch({ type: 'RUN_STARTED' });

		try {
			const reply = await sendMessage(trimmed);
			dispatch({
				type: 'MESSAGE_APPENDED',
				message: { id: crypto.randomUUID(), role: 'assistant', content: reply.content },
			});
		} finally {
			dispatch({ type: 'RUN_FINISHED' });
		}
	}, [dispatch, input, isRunning]);

	return (
		<PageContainer>
			<PageHeader>
				<PageHeaderTitle>
					<span className="text-md font-medium tracking-tight">{ASSISTANT_TITLE}</span>
				</PageHeaderTitle>
			</PageHeader>
			<PageBody className="flex flex-col p-0">
				<div className="flex-1 overflow-y-auto">
					<MessageList messages={messages} />
				</div>
				<Composer
					value={input}
					disabled={isRunning}
					onChange={handleInputChange}
					onSubmit={handleSubmit}
				/>
			</PageBody>
		</PageContainer>
	);
}

export default function Page(): ReactElement {
	return (
		<Layout>
			<PageContent />
		</Layout>
	);
}
