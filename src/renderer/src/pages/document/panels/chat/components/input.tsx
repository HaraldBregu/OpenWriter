import React, { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUp, ChevronDown, Search } from 'lucide-react';
import {
	AppButton,
	AppTextarea,
	AppDropdownMenu,
	AppDropdownMenuContent,
	AppDropdownMenuItem,
	AppDropdownMenuTrigger,
} from '@/components/app';

interface AgentOption {
	readonly id: string;
	readonly label: string;
}

interface InputProps {
	readonly onSend: (message: string) => void;
	readonly disabled?: boolean;
	readonly agentOptions?: readonly AgentOption[];
	readonly selectedAgentId?: string;
	readonly onAgentChange?: (agentId: string) => void;
	readonly selectionLabel?: string | null;
	readonly placeholder?: string;
}

const Input: React.FC<InputProps> = ({
	onSend,
	disabled = false,
	agentOptions,
	selectedAgentId,
	onAgentChange,
	selectionLabel,
	placeholder,
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
	const selectedAgent = agentOptions?.find((agent) => agent.id === selectedAgentId);
	const agentLabel = selectedAgent?.label;

	return (
		<div className="px-3 pb-3 pt-1 shrink-0">
			<div className="overflow-hidden rounded-[1.35rem] border border-border/70 bg-card/90 shadow-none backdrop-blur-sm dark:bg-background">
				<AppTextarea
					ref={textareaRef}
					value={value}
					onChange={handleChange}
					onKeyDown={handleKeyDown}
					disabled={disabled}
					rows={3}
					placeholder={
						placeholder ??
						t('agenticPanel.inputPlaceholder', 'Ask the researcher for context, facts, or ideas')
					}
					aria-label={t('agenticPanel.inputAriaLabel', 'Chat message input')}
					className="w-full resize-none border-none bg-transparent px-3 pt-3 pb-1 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/55 shadow-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
				/>

				<div className="flex items-center gap-2 px-3 pb-3 pt-1">
					{agentLabel ? (
						<div className="flex min-w-0 items-center gap-2">
							<AppDropdownMenu>
								<AppDropdownMenuTrigger asChild>
									<AppButton
										type="button"
										variant="ghost"
										size="sm"
										className="h-7 rounded-full border border-border/70 bg-accent/65 px-2.5 text-xs text-foreground/70 shadow-none hover:bg-accent hover:text-foreground"
										disabled={disabled}
										aria-label={t('agenticPanel.agentSelect', 'Select agent')}
									>
										<Search className="h-3 w-3" aria-hidden="true" />
										<span>{agentLabel}</span>
										<ChevronDown className="h-3 w-3 opacity-70" aria-hidden="true" />
									</AppButton>
								</AppDropdownMenuTrigger>
								<AppDropdownMenuContent
									align="start"
									className="min-w-40 rounded-xl border-border/70 bg-card/95 shadow-none"
								>
									{agentOptions?.map((agent) => (
										<AppDropdownMenuItem
											key={agent.id}
											onClick={() => onAgentChange?.(agent.id)}
											className="text-xs"
										>
											{agent.label}
										</AppDropdownMenuItem>
									))}
								</AppDropdownMenuContent>
							</AppDropdownMenu>

							{selectionLabel ? (
								<div className="max-w-[9.5rem] truncate rounded-full border border-border/70 bg-card/80 px-2.5 py-1 text-xs text-muted-foreground shadow-none dark:bg-background/40">
									{selectionLabel}
								</div>
							) : null}
						</div>
					) : null}

					<div className="flex-1" />

					<AppButton
						type="button"
						variant={canSend ? 'default' : 'ghost'}
						size="icon"
						onClick={handleSend}
						disabled={!canSend}
						aria-label={t('agenticPanel.send', 'Send message')}
						className={`h-7 w-7 rounded-lg shadow-none transition-colors ${
							canSend
								? 'bg-foreground text-background hover:bg-foreground/90'
								: 'text-muted-foreground hover:bg-accent/70 hover:text-foreground'
						}`}
					>
						<ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
					</AppButton>
				</div>
			</div>
		</div>
	);
};

export { Input };
export type { InputProps, AgentOption };
