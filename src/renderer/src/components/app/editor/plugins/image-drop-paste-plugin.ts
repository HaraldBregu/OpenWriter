import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';

export type ImageInsertHandler = (file: File, insertAtPos: number | null) => void;

const IMAGE_MIME_PATTERN = /^image\/(jpeg|jpg|png|gif|webp|svg\+xml|avif)$/;
const imageDropPasteKey = new PluginKey('imageDropPaste');

function isImageFile(file: File): boolean {
	return IMAGE_MIME_PATTERN.test(file.type);
}

export function fileToDataUri(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (): void => resolve(reader.result as string);
		reader.onerror = (): void => reject(new Error(`FileReader failed for ${file.name}`));
		reader.readAsDataURL(file);
	});
}

export function createImageDropPastePlugin(onImageInsert: ImageInsertHandler): Plugin {
	return new Plugin({
		key: imageDropPasteKey,

		props: {
			handlePaste(_view, event) {
				const items = event.clipboardData?.items;
				if (!items) return false;

				const imageFiles: File[] = [];
				for (const item of Array.from(items)) {
					if (item.kind !== 'file') continue;
					const file = item.getAsFile();
					if (file && isImageFile(file)) {
						imageFiles.push(file);
					}
				}

				if (imageFiles.length === 0) return false;

				event.preventDefault();

				for (const file of imageFiles) {
					onImageInsert(file, null);
				}

				return true;
			},

			handleDrop(view, event, _slice, moved) {
				if (moved) return false;

				const files = event.dataTransfer?.files;
				if (!files || files.length === 0) return false;

				const imageFiles = Array.from(files).filter(isImageFile);
				if (imageFiles.length === 0) return false;

				event.preventDefault();

				const coords = { left: event.clientX, top: event.clientY };
				const pos = view.posAtCoords(coords);
				const insertPos = pos ? pos.pos : view.state.doc.content.size;

				// Move cursor to drop position before handing off to the insert handler,
				// so that setImage inserts at the correct location.
				const resolvedPos = view.state.doc.resolve(insertPos);
				const selection = TextSelection.create(view.state.doc, resolvedPos.pos);
				view.dispatch(view.state.tr.setSelection(selection));

				for (const file of imageFiles) {
					onImageInsert(file, insertPos);
				}

				return true;
			},
		},
	});
}
