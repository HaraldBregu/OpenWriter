import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { TextSelection } from '@tiptap/pm/state';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/Textarea';
import type { ContentGeneratorOptions, ContentGeneratorStorage } from './input-extension';
import { ImageAttachmentBar, PromptFooter, PromptHeader } from './components';
import type { ContentGeneratorAgentId } from './agents';
import type { ModelInfo } from '../../../../../../shared/types';
import { DEFAULT_TEXT_MODEL_ID } from '../../../../../../shared/types';
import { IMAGE_MODELS, TEXT_MODELS } from '../../../../../../shared/models';
import { buildTaskPrompt } from '../../../../pages/document/shared';

function readFileAsDataUri(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (): void => resolve(reader.result as string);
		reader.onerror = (): void => reject(new Error(`FileReader failed for ${file.name}`));
		reader.readAsDataURL(file);
	});
}

export function ContentGeneratorNodeView({
	editor,
	node,
	getPos,
	extension,
	updateAttributes,
}: NodeViewProps): React.JSX.Element {
	const loading = node.attrs.loading as boolean;
	const enable = node.attrs.enable as boolean;
	const agentId = (node.attrs.agentId as ContentGeneratorAgentId) ?? 'writer';

	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [prompt, setPrompt] = useState<string>(() => (node.attrs.prompt as string) ?? '');
	const [files, setFiles] = useState<File[]>([]);
	const [previewUrls, setPreviewUrls] = useState<string[]>([]);
	const options = extension.options as ContentGeneratorOptions;
	const storage = (editor.storage as unknown as Record<string, ContentGeneratorStorage>)
		.contentGenerator;
	const [selectedImageModel, setSelectedImageModel] = useState<ModelInfo>(
		() => storage.defaultImageModel ?? IMAGE_MODELS[0]
	);
	const [selectedTextModel, setSelectedTextModel] = useState<ModelInfo>(
		() =>
			storage.defaultTextModel ??
			TEXT_MODELS.find((m) => m.modelId === DEFAULT_TEXT_MODEL_ID) ??
			TEXT_MODELS[0]
	);

	const handleImageModelChange = useCallback(
		(model: ModelInfo) => {
			setSelectedImageModel(model);
			options.onImageModelChange?.(model);
		},
		[options]
	);

	const handleTextModelChange = useCallback(
		(model: ModelInfo) => {
			setSelectedTextModel(model);
			options.onTextModelChange?.(model);
		},
		[options]
	);

	const handlePromptChange = useCallback(
		(value: string) => {
			setPrompt(value);
			if ((node.attrs.prompt as string) !== value) {
				updateAttributes({ prompt: value });
			}
		},
		[node.attrs.prompt, updateAttributes]
	);

	const handleAgentChange = useCallback(
		(value: ContentGeneratorAgentId) => {
			if ((node.attrs.agentId as ContentGeneratorAgentId) !== value) {
				updateAttributes({ agentId: value });
			}
		},
		[node.attrs.agentId, updateAttributes]
	);

	const addFile = useCallback((newFile: File) => {
		setFiles((prev) => [...prev, newFile]);
		readFileAsDataUri(newFile)
			.then((result) => {
				setPreviewUrls((prev) => [...prev, result]);
			})
			.catch(() => {});
	}, []);

	const removeFile = useCallback((index: number) => {
		setFiles((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
		setPreviewUrls((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
	}, []);

	const handleFileInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const selected = e.target.files;
			if (!selected) return;
			for (const file of Array.from(selected)) {
				if (file.type.startsWith('image/')) {
					addFile(file);
				}
			}
			e.target.value = '';
		},
		[addFile]
	);

	const handleOpenFilePicker = useCallback(() => {
		fileInputRef.current?.click();
	}, []);

	const deleteNode = useCallback(() => {
		const pos = getPos();
		if (typeof pos !== 'number') return;

		const paragraph = editor.state.schema.nodes.paragraph;
		if (!paragraph) {
			editor
				.chain()
				.focus()
				.deleteRange({ from: pos, to: pos + node.nodeSize })
				.run();
			return;
		}

		// Keep an editable block in place when the assistant UI is dismissed.
		const tr = editor.state.tr.replaceWith(pos, pos + node.nodeSize, paragraph.create());
		tr.setSelection(TextSelection.create(tr.doc, Math.min(pos + 1, tr.doc.content.size)));
		editor.view.dispatch(tr.scrollIntoView());
		editor.view.focus();
	}, [editor, getPos, node.nodeSize]);

	const submit = useCallback(() => {
		const trimmedPrompt = prompt.trim();
		const canSubmitWithFiles = agentId === 'image' && files.length > 0;
		if (!trimmedPrompt && !canSubmitWithFiles) {
			deleteNode();
			return;
		}

		const options = extension.options as ContentGeneratorOptions;
		const { from } = editor.state.selection;
		const storage = editor.storage as unknown as Record<string, Record<string, unknown>>;
		const serializer = storage.markdown?.serializer as
			| { serialize: (node: unknown) => string }
			| undefined;
		const docSize = editor.state.doc.content.size;
		const subDocBefore = editor.state.doc.cut(0, from);
		const subDocAfter = editor.state.doc.cut(from, docSize);
		const rawBefore =
			serializer?.serialize(subDocBefore) ?? editor.state.doc.textBetween(0, from, '\n');
		const rawAfter =
			serializer?.serialize(subDocAfter) ?? editor.state.doc.textBetween(from, docSize, '\n');
		const stripHtml = (text: string): string => text.replace(/<[^>]*>/g, '');

		updateAttributes({ loading: true, enable: false });

		const before = stripHtml(rawBefore);
		const after = stripHtml(rawAfter);

		if (agentId === 'image') {
			const effectivePrompt =
				!trimmedPrompt && files.length > 0
					? 'Create an image inspired by the uploaded reference images.'
					: trimmedPrompt;
			const builtPrompt = buildTaskPrompt(before, after, effectivePrompt);
			options.onGenerateImageSubmit(builtPrompt, files);
		} else {
			const builtPrompt = buildTaskPrompt(before, after, trimmedPrompt);
			options.onGenerateTextSubmit(builtPrompt);
		}
	}, [agentId, files, prompt, deleteNode, editor, extension.options, updateAttributes]);

	const submitRef = useRef<(() => void) | null>(submit);
	submitRef.current = submit;
	const deleteNodeRef = useRef(deleteNode);
	deleteNodeRef.current = deleteNode;

	const resizeTextarea = useCallback(() => {
		const textarea = textareaRef.current;
		if (!textarea) return;
		textarea.style.height = 'auto';
		textarea.style.height = `${textarea.scrollHeight}px`;
	}, []);

	useEffect(() => {
		const textarea = textareaRef.current;
		if (!textarea) return;

		requestAnimationFrame(() => {
			textarea.focus();
			resizeTextarea();
		});

		const handleKeyDown = (e: KeyboardEvent): void => {
			e.stopPropagation();
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault();
				submitRef.current?.();
			} else if (e.key === 'Escape') {
				deleteNodeRef.current();
			}
		};

		textarea.addEventListener('keydown', handleKeyDown);
		return () => textarea.removeEventListener('keydown', handleKeyDown);
	}, [resizeTextarea]);

	
	return (
		<NodeViewWrapper contentEditable={false}>
			<Card>
				<ContentGeneratorContent
					prompt={prompt}
					agentId={agentId}
					files={files}
					previewUrls={previewUrls}
					isDragOver={isDragOver}
					loading={loading}
					enable={enable}
					selectedImageModel={selectedImageModel}
					selectedTextModel={selectedTextModel}
					textareaRef={textareaRef}
					fileInputRef={fileInputRef}
					submitRef={submitRef}
					onPromptChange={handlePromptChange}
					onAgentChange={handleAgentChange}
					onImageModelChange={handleImageModelChange}
					onTextModelChange={handleTextModelChange}
					onRemoveFile={removeFile}
					onFileInputChange={handleFileInputChange}
					onOpenFilePicker={handleOpenFilePicker}
					onResize={resizeTextarea}
				/>
			</Card>
		</NodeViewWrapper>
	);
}
