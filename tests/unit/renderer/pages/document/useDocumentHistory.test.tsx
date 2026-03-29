import { renderHook, act, waitFor } from '@testing-library/react';
import { useDocumentHistory } from '../../../../../src/renderer/src/pages/document/hooks/use-document-history';

describe('useDocumentHistory', () => {
	beforeEach(() => {
		jest.clearAllMocks();

		Object.assign(window.workspace, {
			getDocumentPath: jest.fn().mockResolvedValue('/workspace/output/documents/doc-1'),
			onOutputFileChange: jest.fn(),
			listDir: jest.fn(),
		});
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
});
