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
	readonly placeholder?: string;
}

const Input: React.FC<InputProps> = ({
	onSend,
	disabled = false,
	agentOptions,
	selectedAgentId,
	onAgentChange,
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
			<div className="overflow-hidden rounded-2xl border border-border bg-background">
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
					className="w-full resize-none bg-transparent px-3 pt-2 pb-1 text-sm text-foreground placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 leading-relaxed border-none shadow-none"
				/>

				<div className="flex items-center gap-2 px-3 pb-3 pt-1">
					{agentLabel ? (
						<AppDropdownMenu>
							<AppDropdownMenuTrigger asChild>
								<AppButton
									type="button"
									variant="ghost"
									size="sm"
									className="h-7 rounded-full border border-border bg-muted px-2.5 text-xs text-muted-foreground"
									disabled={disabled}
									aria-label={t('agenticPanel.agentSelect', 'Select agent')}
								>
									<Search className="h-3 w-3" aria-hidden="true" />
									<span>{agentLabel}</span>
									<ChevronDown className="h-3 w-3 opacity-70" aria-hidden="true" />
								</AppButton>
							</AppDropdownMenuTrigger>
							<AppDropdownMenuContent align="start" className="min-w-40">
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
					) : null}

					<div className="flex-1" />

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

export { Input };
export type { InputProps, AgentOption };
