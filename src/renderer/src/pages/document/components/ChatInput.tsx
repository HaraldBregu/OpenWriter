import React, { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
	Plus,
	Code2,
	ChevronDown,
	SlidersHorizontal,
	Mic,
	ArrowUp,
	FileCode2,
	X,
} from 'lucide-react';
import { AppButton } from '@/components/app';

interface ContextFile {
	readonly id: string;
	readonly name: string;
}

interface ChatInputProps {
	readonly onSend: (message: string) => void;
	readonly disabled?: boolean;
	readonly contextFiles?: ContextFile[];
	readonly onRemoveContextFile?: (id: string) => void;
}

const DEMO_CONTEXT_FILES: ContextFile[] = [{ id: 'demo-1', name: 'AppLayout.tsx' }];

const ChatInput: React.FC<ChatInputProps> = ({
	onSend,
	disabled = false,
	contextFiles = DEMO_CONTEXT_FILES,
	onRemoveContextFile,
}) => {
	const { t } = useTranslation();
	const [value, setValue] = useState('');
	const textareaRef = useRef<HTMLTextAreaElement>(null);

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

	const canSend = value.trim().length > 0 && !disabled;

	return (
		<div className="px-3 pb-3 pt-1 shrink-0">
			<div className="rounded-2xl border border-dashed border-border bg-muted/40 overflow-hidden">
				{/* Context file chips */}
				{contextFiles.length > 0 && (
					<div className="flex flex-wrap gap-1.5 px-3 pt-3 pb-1">
						{contextFiles.map((file) => (
							<div
								key={file.id}
								className="flex items-center gap-1.5 rounded-md border border-border bg-background/60 px-2 py-1 text-xs text-muted-foreground"
							>
								<FileCode2 className="h-3 w-3 shrink-0 text-blue-400" aria-hidden="true" />
								<span className="max-w-[120px] truncate">{file.name}</span>
								{onRemoveContextFile && (
									<button
										type="button"
										onClick={() => onRemoveContextFile(file.id)}
										aria-label={t('agenticPanel.removeFile', 'Remove {{name}}', {
											name: file.name,
										})}
										className="ml-0.5 rounded-sm text-muted-foreground/60 hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
									>
										<X className="h-2.5 w-2.5" aria-hidden="true" />
									</button>
								)}
							</div>
						))}
					</div>
				)}

				{/* Textarea */}
				<textarea
					ref={textareaRef}
					value={value}
					onChange={handleChange}
					onKeyDown={handleKeyDown}
					disabled={disabled}
					rows={3}
					placeholder={t('agenticPanel.inputPlaceholder', 'Describe what to build')}
					aria-label={t('agenticPanel.inputAriaLabel', 'Chat message input')}
					className="w-full resize-none bg-transparent px-3 pt-2 pb-1 text-sm text-foreground placeholder:text-muted-foreground/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 leading-relaxed"
				/>

				{/* Bottom toolbar */}
				<div className="flex items-center gap-1 px-2 pb-2 pt-1">
					{/* Left actions */}
					<AppButton
						type="button"
						variant="ghost"
						size="icon"
						aria-label={t('agenticPanel.attach', 'Attach file')}
						className="h-7 w-7 text-muted-foreground hover:text-foreground"
					>
						<Plus className="h-3.5 w-3.5" aria-hidden="true" />
					</AppButton>

					<AppButton
						type="button"
						variant="ghost"
						size="icon"
						aria-label={t('agenticPanel.insertCode', 'Insert code')}
						className="h-7 w-7 text-muted-foreground hover:text-foreground"
					>
						<Code2 className="h-3.5 w-3.5" aria-hidden="true" />
					</AppButton>

					<AppButton
						type="button"
						variant="ghost"
						size="sm"
						aria-label={t('agenticPanel.selectModel', 'Select model')}
						className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
					>
						{t('agenticPanel.modelAuto', 'Auto')}
						<ChevronDown className="h-3 w-3" aria-hidden="true" />
					</AppButton>

					<AppButton
						type="button"
						variant="ghost"
						size="icon"
						aria-label={t('agenticPanel.settings', 'Settings')}
						className="h-7 w-7 text-muted-foreground hover:text-foreground"
					>
						<SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
					</AppButton>

					{/* Spacer */}
					<div className="flex-1" />

					{/* Right actions */}
					<AppButton
						type="button"
						variant="ghost"
						size="icon"
						aria-label={t('agenticPanel.voiceInput', 'Voice input')}
						className="h-7 w-7 text-muted-foreground hover:text-foreground"
					>
						<Mic className="h-3.5 w-3.5" aria-hidden="true" />
					</AppButton>

					<AppButton
						type="button"
						variant={canSend ? 'default' : 'ghost'}
						size="icon"
						onClick={handleSend}
						disabled={!canSend}
						aria-label={t('agenticPanel.send', 'Send message')}
						className="h-7 w-7 rounded-lg transition-all"
					>
						<ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
					</AppButton>
				</div>
			</div>
		</div>
	);
};

export { ChatInput };
export type { ChatInputProps, ContextFile };
