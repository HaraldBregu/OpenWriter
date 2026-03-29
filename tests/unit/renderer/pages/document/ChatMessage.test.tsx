import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('lucide-react', () => {
	const Icon = (props: Record<string, unknown>) => React.createElement('svg', props);
	return {
		LoaderCircle: Icon,
	};
});

jest.mock('react-markdown', () => ({
	__esModule: true,
	default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('remark-gfm', () => ({
	__esModule: true,
	default: jest.fn(),
}));

import { ChatMessage } from '../../../../../src/renderer/src/pages/document/panels/chat/components/Message';

describe('ChatMessage', () => {
	it('renders the assistant response body', () => {
		render(
			<ChatMessage
				id="assistant-message"
				content="Here is the final answer."
				role="assistant"
				timestamp="2026-03-29T12:00:00.000Z"
				status="running"
			/>
		);

		expect(screen.getByText('Here is the final answer.')).toBeInTheDocument();
	});

	it('renders system status messages as standalone timeline rows', () => {
		render(
			<ChatMessage
				id="system-message"
				content="Completed"
				role="system"
				timestamp="2026-03-29T12:00:00.000Z"
				status="completed"
			/>
		);

		expect(screen.getByText('Completed')).toBeInTheDocument();
		expect(screen.queryByTestId('status-loader')).not.toBeInTheDocument();
	});

	it('shows a loader for non-completed system status messages', () => {
		render(
			<ChatMessage
				id="system-message"
				content="Researching"
				role="system"
				timestamp="2026-03-29T12:00:00.000Z"
				status="running"
				showStatusLoader
			/>
		);

		expect(screen.getByText('Researching')).toBeInTheDocument();
		expect(screen.getByTestId('status-loader')).toBeInTheDocument();
	});

	it('does not show a loader for non-latest system status messages', () => {
		render(
			<ChatMessage
				id="system-message"
				content="Queued"
				role="system"
				timestamp="2026-03-29T12:00:00.000Z"
				status="queued"
			/>
		);

		expect(screen.getByText('Queued')).toBeInTheDocument();
		expect(screen.queryByTestId('status-loader')).not.toBeInTheDocument();
	});

	it('does not render an empty assistant placeholder without content', () => {
		const { container } = render(
			<ChatMessage
				id="assistant-message"
				content=""
				role="assistant"
				timestamp="2026-03-29T12:00:00.000Z"
				status="queued"
			/>
		);

		expect(container).toBeEmptyDOMElement();
	});
});
