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

	it('falls back to Thinking while an assistant response is pending without a state message', () => {
		render(
			<ChatMessage
				id="assistant-message"
				content=""
				role="assistant"
				timestamp="2026-03-29T12:00:00.000Z"
				status="queued"
			/>
		);

		expect(screen.getByText('Thinking')).toBeInTheDocument();
	});
});
