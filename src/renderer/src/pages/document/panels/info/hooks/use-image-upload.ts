import { useCallback, useRef } from 'react';
import { useDocumentDispatch, useDocumentState } from '../../../hooks';

const DATA_URI_REGEX = /^data:image\/(\w+);base64,(.+)$/;

function readFileAsDataUri(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (): void => resolve(reader.result as string);
		reader.onerror = (): void => reject(new Error(`FileReader failed for ${file.name}`));
		reader.readAsDataURL(file);
	});
}

interface UseImageUploadResult {
	readonly fileInputRef: React.RefObject<HTMLInputElement | null>;
	readonly handleUploadClick: () => void;
	readonly handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
}

export function useImageUpload(): UseImageUploadResult {
	const { documentId } = useDocumentState();
	const dispatch = useDocumentDispatch();
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleUploadClick = useCallback(() => {
		fileInputRef.current?.click();
	}, []);

	const handleFileChange = useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			const files = e.target.files;
			if (!files || files.length === 0 || !documentId) return;

			for (const file of Array.from(files)) {
				try {
					const dataUri = await readFileAsDataUri(file);
					const match = dataUri.match(DATA_URI_REGEX);
					if (match) {
						const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
						const base64 = match[2];
						const fileName = `${crypto.randomUUID()}.${ext}`;
						await window.workspace.saveDocumentImage({
							documentId,
							fileName,
							base64,
						});
					}
				} catch {
					/* skip failed files */
				}
			}

			e.target.value = '';

			try {
				const updated = await window.workspace.listDocumentImages(documentId);
				dispatch({ type: 'IMAGES_UPDATED', images: updated });
			} catch {
				/* file watcher will pick it up */
			}
		},
		[documentId, dispatch]
	);

	return { fileInputRef, handleUploadClick, handleFileChange };
}
