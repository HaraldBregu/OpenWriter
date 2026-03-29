import { renderHook, act, waitFor } from '@testing-library/react';
import { useDocumentHistory } from '../../../../../src/renderer/src/pages/document/hooks/use-document-history';

describe('useDocumentHistory', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		jest.useFakeTimers();

		Object.assign(window.workspace, {
			getDocumentPath: jest.fn().mockResolvedValue('/workspace/output/documents/doc-1'),
			onOutputFileChange: jest.fn(),
			listDir: jest.fn(),
			createFolder: jest.fn().mockResolvedValue(undefined),
			writeFile: jest.fn().mockResolvedValue(undefined),
		});
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it('reloads header history when history files are removed from the document folder', async () => {
		let outputFileChangeHandler:
			| ((event: {
					type: 'added' | 'changed' | 'removed';
					outputType: string;
					fileId: string;
					filePath: string;
					timestamp: number;
			  }) => void)
			| null = null;

		(window.workspace.onOutputFileChange as jest.Mock).mockImplementation((handler) => {
			outputFileChangeHandler = handler;
			return jest.fn();
		});

		(window.workspace.listDir as jest.Mock)
			.mockResolvedValueOnce([{ name: 'entry-1.json', isDirectory: false }])
			.mockResolvedValueOnce([]);

		(window.workspace.readFile as jest.Mock).mockResolvedValue(
			JSON.stringify({
				id: 'entry-1',
				title: 'Draft snapshot',
				savedAt: '2026-03-29T10:00:00.000Z',
				content: 'Draft snapshot body',
			})
		);

		const { result } = renderHook(() =>
			useDocumentHistory({
				documentId: 'doc-1',
				content: 'Current draft',
				title: 'Draft',
				loaded: true,
				onRestore: jest.fn(),
			})
		);

		await waitFor(() => {
			expect(result.current.entries).toHaveLength(1);
		});

		expect(outputFileChangeHandler).not.toBeNull();

		await act(async () => {
			outputFileChangeHandler?.({
				type: 'removed',
				outputType: 'documents',
				fileId: 'doc-1',
				filePath: '/workspace/output/documents/doc-1/history/entry-1.json',
				timestamp: Date.now(),
			});
		});

		await waitFor(() => {
			expect(result.current.entries).toHaveLength(0);
		});
	});

	it('stores the latest editor content after the debounce window', async () => {
		const onRestore = jest.fn();
		(window.workspace.onOutputFileChange as jest.Mock).mockReturnValue(jest.fn());
		(window.workspace.listDir as jest.Mock).mockResolvedValue([]);

		const { rerender } = renderHook(
			(props: { documentId: string; content: string; title: string; loaded: boolean }) =>
				useDocumentHistory({
					...props,
					onRestore,
				}),
			{
				initialProps: {
					documentId: 'doc-1',
					content: 'Initial draft',
					title: 'Draft',
					loaded: false,
				},
			}
		);

		await waitFor(() => {
			expect(window.workspace.getDocumentPath).toHaveBeenCalledWith('doc-1');
		});

		rerender({
			documentId: 'doc-1',
			content: 'Initial draft',
			title: 'Draft',
			loaded: true,
		});
		rerender({
			documentId: 'doc-1',
			content: 'Updated draft from editor',
			title: 'Draft',
			loaded: true,
		});

		expect(window.workspace.writeFile).not.toHaveBeenCalled();

		await act(async () => {
			jest.advanceTimersByTime(1499);
		});

		expect(window.workspace.writeFile).not.toHaveBeenCalled();

		await act(async () => {
			jest.advanceTimersByTime(1);
		});

		await waitFor(() => {
			expect(window.workspace.writeFile).toHaveBeenCalledTimes(1);
		});

		expect(window.workspace.writeFile).toHaveBeenCalledWith(
			expect.objectContaining({
				filePath: expect.stringContaining('/history/'),
				content: expect.stringContaining('Updated draft from editor'),
			})
		);
	});

	it('flushes a pending history snapshot on unmount so recent typing is not lost', async () => {
		const onRestore = jest.fn();
		(window.workspace.onOutputFileChange as jest.Mock).mockReturnValue(jest.fn());
		(window.workspace.listDir as jest.Mock).mockResolvedValue([]);

		const { rerender, unmount } = renderHook(
			(props: { documentId: string; content: string; title: string; loaded: boolean }) =>
				useDocumentHistory({
					...props,
					onRestore,
				}),
			{
				initialProps: {
					documentId: 'doc-1',
					content: 'Initial draft',
					title: 'Draft',
					loaded: false,
				},
			}
		);

		await waitFor(() => {
			expect(window.workspace.getDocumentPath).toHaveBeenCalledWith('doc-1');
		});

		rerender({
			documentId: 'doc-1',
			content: 'Initial draft',
			title: 'Draft',
			loaded: true,
		});
		rerender({
			documentId: 'doc-1',
			content: 'Unsaved typing',
			title: 'Draft',
			loaded: true,
		});

		await act(async () => {
			unmount();
		});

		await waitFor(() => {
			expect(window.workspace.writeFile).toHaveBeenCalledTimes(1);
		});

		expect(window.workspace.writeFile).toHaveBeenCalledWith(
			expect.objectContaining({
				filePath: expect.stringContaining('/history/'),
				content: expect.stringContaining('Unsaved typing'),
			})
		);
	});
});
