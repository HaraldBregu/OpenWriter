import React, { useState, useRef, useCallback } from 'react';
import { Send } from 'lucide-react';

const MIN_ROWS = 1;
const MAX_ROWS = 4;
const LINE_HEIGHT_PX = 20;
const PADDING_VERTICAL_PX = 16;

interface ChatInputProps {
	readonly onSend: (message: string) => void;
	readonly disabled?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled = false }) => {
	const [value, setValue] = useState('');
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const adjustHeight = useCallback(() => {
		const el = textareaRef.current;
		if (!el) return;
		el.style.height = 'auto';
		const scrollHeight = el.scrollHeight;
		const minHeight = MIN_ROWS * LINE_HEIGHT_PX + PADDING_VERTICAL_PX;
		const maxHeight = MAX_ROWS * LINE_HEIGHT_PX + PADDING_VERTICAL_PX;
		el.style.height = `${Math.min(Math.max(scrollHeight, minHeight), maxHeight)}px`;
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

	return (
		<div className="flex items-end gap-2 p-3 border-t border-border bg-background/60">
			<textarea
				ref={textareaRef}
				value={value}
				onChange={handleChange}
				onKeyDown={handleKeyDown}
				disabled={disabled}
				rows={MIN_ROWS}
				placeholder="Message…"
				aria-label="Chat message input"
				className="flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 leading-5 overflow-y-auto"
				style={{ minHeight: `${MIN_ROWS * LINE_HEIGHT_PX + PADDING_VERTICAL_PX}px` }}
			/>
			<button
				type="button"
				onClick={handleSend}
				disabled={disabled || value.trim().length === 0}
				aria-label="Send message"
				className="shrink-0 flex items-center justify-center h-9 w-9 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
			>
				<Send className="h-4 w-4" aria-hidden="true" />
			</button>
		</div>
	);
};

export { ChatInput };
export type { ChatInputProps };
