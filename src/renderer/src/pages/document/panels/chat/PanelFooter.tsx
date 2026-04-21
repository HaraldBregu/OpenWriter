import React, { useState, useRef, useCallback, useMemo, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { CardFooter } from '@/components/ui/Card';
import { PromptCard } from './components/PromptCard';

const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml,image/avif';

type ContentGeneratorAgentId = 'text' | 'image';

interface ContentGeneratorAgentOption {
	value: ContentGeneratorAgentId;
	labelKey: string;
	labelFallback: string;
	descriptionKey: string;
	descriptionFallback: string;
}

const CONTENT_GENERATOR_AGENT_OPTIONS: readonly ContentGeneratorAgentOption[] = [
	{
		value: 'text',
		labelKey: 'assistantAgent.text',
		labelFallback: 'Text',
		descriptionKey: 'assistantAgent.textDescription',
		descriptionFallback: 'Generate, rewrite, or continue text',
	},
	{
		value: 'image',
		labelKey: 'assistantAgent.image',
		labelFallback: 'Image',
		descriptionKey: 'assistantAgent.imageDescription',
		descriptionFallback: 'Create images from a prompt',
	},
];

function readFileAsDataUri(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (): void => resolve(reader.result as string);
		reader.onerror = (): void => reject(new Error(`FileReader failed for ${file.name}`));
		reader.readAsDataURL(file);
	});
}

interface InputProps {
	readonly onSend: (message: string) => void;
	readonly disabled?: boolean;
	readonly selectionLabel?: string | null;
	readonly canClearSelection?: boolean;
	readonly onClearSelection?: () => void;
	readonly placeholder?: string;
}

const PanelFooter: React.FC<InputProps> = ({
	onSend,
	disabled = false,
	selectionLabel,
	canClearSelection = false,
	onClearSelection,
	placeholder,
}) => {
	const { t } = useTranslation();
	const [value, setValue] = useState('');
	const [isFocused, setIsFocused] = useState(false);
	const [agentId, setAgentId] = useState<ContentGeneratorAgentId>('text');
	const [files, setFiles] = useState<File[]>([]);
	const [previewUrls, setPreviewUrls] = useState<string[]>([]);
	const [isDragOver, setIsDragOver] = useState(false);

	const wrapperRef = useRef<HTMLDivElement>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const isImage = agentId === 'image';

	const adjustHeight = useCallback(() => {
		const el = textareaRef.current;
		if (!el) return;
		el.style.height = 'auto';
		const maxHeightPx = 160;
		el.style.height = `${Math.min(el.scrollHeight, maxHeightPx)}px`;
	}, []);

	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLTextAreaElement>) => {
			setValue(e.target.value);
			adjustHeight();
		},
		[adjustHeight]
	);

	const handleSend = useCallback(() => {
		const trimmed = value.trim();
		if (!trimmed || disabled) return;
		onSend(trimmed);
		setValue('');
		setFiles([]);
		setPreviewUrls([]);
		if (textareaRef.current) {
			textareaRef.current.style.height = 'auto';
		}
	}, [value, disabled, onSend]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault();
				handleSend();
			}
		},
		[handleSend]
	);

	const addFile = useCallback((newFile: File) => {
		readFileAsDataUri(newFile)
			.then((result) => {
				setFiles((prev) => [...prev, newFile]);
				setPreviewUrls((prev) => [...prev, result]);
			})
			.catch(() => {
				// FileReader failed — do not add the file to avoid files/previewUrls desync
			});
	}, []);

	const handleRemoveClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
		const index = Number(e.currentTarget.dataset.index);
		setFiles((prev) => prev.filter((_, i) => i !== index));
		setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
	}, []);

	const handleFileInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const selected = e.target.files;
			if (!selected) return;
			for (const file of Array.from(selected)) {
				if (file.type.startsWith('image/')) addFile(file);
			}
			e.target.value = '';
		},
		[addFile]
	);

	const openFilePicker = useCallback(() => {
		fileInputRef.current?.click();
	}, []);

	const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		setIsDragOver(true);
	}, []);

	const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		setIsDragOver(false);
	}, []);

	const handleDrop = useCallback(
		(e: React.DragEvent<HTMLDivElement>) => {
			e.preventDefault();
			setIsDragOver(false);
			for (const file of Array.from(e.dataTransfer.files)) {
				if (file.type.startsWith('image/')) addFile(file);
			}
		},
		[addFile]
	);

	const canSend = useMemo(() => value.trim().length > 0 && !disabled, [value, disabled]);

	const currentAgent = useMemo(
		() =>
			CONTENT_GENERATOR_AGENT_OPTIONS.find((o) => o.value === agentId) ??
			CONTENT_GENERATOR_AGENT_OPTIONS[0],
		[agentId]
	);

	const handleFocus = useCallback(() => {
		setIsFocused(true);
	}, []);

	const handleWrapperBlur = useCallback((e: React.FocusEvent<HTMLDivElement>) => {
		if (wrapperRef.current?.contains(e.relatedTarget as Node | null)) return;
		setIsFocused(false);
	}, []);

	const dropStatusId = useId();

	const imageCountAnnouncement =
		files.length > 0
			? t('agenticPanel.imageCountAnnouncement', '{{count}} reference image(s) attached', {
					count: files.length,
				})
			: '';

	const currentAgentLabel = t(currentAgent.labelKey, currentAgent.labelFallback);

	const fileNames = useMemo(() => files.map((f) => f.name), [files]);

	return (
		<CardFooter className='border-none bg-transparent pt-0!'>
			{/* Hidden live region — announces image attachment changes to screen readers */}
			<div
				id={dropStatusId}
				role="status"
				aria-live="polite"
				aria-atomic="true"
				className="sr-only"
			>
				{imageCountAnnouncement}
			</div>

			<input
				ref={fileInputRef}
				type="file"
				accept={ACCEPTED_IMAGE_TYPES}
				className="hidden"
				onChange={handleFileInputChange}
				aria-hidden="true"
				tabIndex={-1}
				multiple
			/>

			<PromptCard
				value={value}
				disabled={disabled}
				isFocused={isFocused}
				isDragOver={isDragOver}
				canSend={canSend}
				agentId={agentId}
				isImage={isImage}
				previewUrls={previewUrls}
				fileNames={fileNames}
				selectionLabel={selectionLabel}
				canClearSelection={canClearSelection}
				placeholder={placeholder}
				currentAgentLabel={currentAgentLabel}
				wrapperRef={wrapperRef}
				textareaRef={textareaRef}
				onChange={handleChange}
				onKeyDown={handleKeyDown}
				onFocus={handleFocus}
				onWrapperBlur={handleWrapperBlur}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
				onSend={handleSend}
				onOpenFilePicker={openFilePicker}
				onRemoveImage={handleRemoveClick}
				onClearSelection={onClearSelection}
				onAgentChange={setAgentId}
				onModelChange={handleModelChange}
			/>
		</CardFooter>
	);
};

export { PanelFooter };
export type { InputProps };
