import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string) => key,
		i18n: { changeLanguage: jest.fn() },
	}),
	initReactI18next: { type: '3rdParty', init: jest.fn() },
}));

jest.mock('lucide-react', () => {
	const Icon = (props: Record<string, unknown>) => React.createElement('svg', props);
	return {
		FolderOpen: Icon,
		MoreHorizontal: Icon,
		Copy: Icon,
		Trash2: Icon,
		FileText: Icon,
		PenLine: Icon,
		Search: Icon,
		X: Icon,
		Bot: Icon,
		Undo2: Icon,
		Redo2: Icon,
	};
});

jest.mock('../../../../../src/renderer/src/components/app', () => {
	const React = require('react') as typeof import('react');

	const AppButton = React.forwardRef<
		HTMLButtonElement,
		React.ButtonHTMLAttributes<HTMLButtonElement>
	>(({ children, ...props }, ref) =>
		React.createElement('button', {
			ref,
			...props,
			children,
		})
	);
	AppButton.displayName = 'AppButton';

	return {
		AppButton,
		AppDropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
		AppDropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
		AppDropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
		AppDropdownMenuItem: ({
			children,
			onClick,
			disabled,
		}: {
			children: React.ReactNode;
			onClick?: () => void;
			disabled?: boolean;
		}) => (
			<button type="button" onClick={onClick} disabled={disabled}>
				{children}
			</button>
		),
	};
});

const toggleSidebar = jest.fn();

jest.mock('../../../../../src/renderer/src/pages/document/context', () => ({
	useSidebarVisibility: () => ({
		activeSidebar: null,
		toggleSidebar,
	}),
}));

jest.mock('../../../../../src/renderer/src/pages/document/components/HistoryMenu', () => () => (
	<div data-testid="history-menu" />
));

import Header from '../../../../../src/renderer/src/pages/document/Header';

describe('Document Header', () => {
	beforeEach(() => {
		toggleSidebar.mockReset();
	});

	it('renders undo and redo buttons in the header and wires their callbacks', async () => {
		const user = userEvent.setup();
		const onUndo = jest.fn();
		const onRedo = jest.fn();

		render(
			<Header
				title="Draft"
				onTitleChange={jest.fn()}
				isTrashing={false}
				onMoveToTrash={jest.fn()}
				onSearch={jest.fn()}
				onClearSearch={jest.fn()}
				onOpenFolder={jest.fn()}
				historyEntries={[]}
				currentHistoryEntryId={null}
				canUndo
				canRedo
				onUndo={onUndo}
				onRedo={onRedo}
				onRestoreHistoryEntry={jest.fn()}
			/>
		);

		await user.click(screen.getByRole('button', { name: 'Undo' }));
		await user.click(screen.getByRole('button', { name: 'Redo' }));

		expect(onUndo).toHaveBeenCalledTimes(1);
		expect(onRedo).toHaveBeenCalledTimes(1);
	});

	it('disables undo and redo buttons when history navigation is unavailable', () => {
		render(
			<Header
				title="Draft"
				onTitleChange={jest.fn()}
				isTrashing={false}
				onMoveToTrash={jest.fn()}
				onSearch={jest.fn()}
				onClearSearch={jest.fn()}
				onOpenFolder={jest.fn()}
				historyEntries={[]}
				currentHistoryEntryId={null}
				canUndo={false}
				canRedo={false}
				onUndo={jest.fn()}
				onRedo={jest.fn()}
				onRestoreHistoryEntry={jest.fn()}
			/>
		);

		expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
		expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled();
	});
});
