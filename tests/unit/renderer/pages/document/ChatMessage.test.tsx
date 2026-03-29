import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('lucide-react', () => {
	const Icon = (props: Record<string, unknown>) => React.createElement('svg', props);
	return {
		ChevronRight: Icon,
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

import { ChatMessage } from '../../../../../src/renderer/src/pages/document/components/ChatMessage';

describe('ChatMessage', () => {
	it('shows the assistant state message separately from the response body', () => {
		render(
			<ChatMessage
				id="assistant-message"
				content="Here is the final answer."
				stateMessage="Composing response..."
				role="assistant"
				timestamp="2026-03-29T12:00:00.000Z"
				status="running"
			/>
		);

		expect(screen.getByText('Composing response...')).toBeInTheDocument();
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
	});

	it('does not render an empty assistant placeholder without content or state text', () => {
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
