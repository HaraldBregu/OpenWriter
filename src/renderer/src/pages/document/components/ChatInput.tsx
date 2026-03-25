import React, { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, SlidersHorizontal, Mic, ArrowUp } from 'lucide-react';
import {
	AppButton,
	AppTextarea,
	AppSelect,
	AppSelectTrigger,
	AppSelectValue,
	AppSelectContent,
	AppSelectItem,
} from '@/components/app';

interface ChatInputProps {
	readonly onSend: (message: string) => void;
	readonly disabled?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled = false }) => {
	const { t } = useTranslation();
	const [value, setValue] = useState('');
	const [selectedAgent, setSelectedAgent] = useState<string>('nova');
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
				{/* Textarea */}
				<AppTextarea
					ref={textareaRef}
					value={value}
					onChange={handleChange}
					onKeyDown={handleKeyDown}
					disabled={disabled}
					rows={3}
					placeholder={t('agenticPanel.inputPlaceholder', 'Describe what to build')}
					aria-label={t('agenticPanel.inputAriaLabel', 'Chat message input')}
					className="w-full resize-none bg-transparent px-3 pt-2 pb-1 text-sm text-foreground placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 leading-relaxed border-none shadow-none"
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

					<AppSelect value={selectedAgent} onValueChange={setSelectedAgent}>
						<AppSelectTrigger className="h-7 w-fit px-2 text-xs border-none bg-transparent text-muted-foreground hover:text-foreground shadow-none focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none">
							<AppSelectValue />
						</AppSelectTrigger>
						<AppSelectContent>
							<AppSelectItem value="nova">Nova</AppSelectItem>
							<AppSelectItem value="sage">Sage</AppSelectItem>
							<AppSelectItem value="echo">Echo</AppSelectItem>
							<AppSelectItem value="draft">Draft</AppSelectItem>
							<AppSelectItem value="lens">Lens</AppSelectItem>
						</AppSelectContent>
					</AppSelect>

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
export type { ChatInputProps };
