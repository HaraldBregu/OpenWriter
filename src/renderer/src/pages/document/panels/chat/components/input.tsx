import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUp, ChevronDown, Search, X } from 'lucide-react';
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
	readonly canClearSelection?: boolean;
	readonly onClearSelection?: () => void;
	readonly placeholder?: string;
}

const Input: React.FC<InputProps> = ({
	onSend,
	disabled = false,
	agentOptions,
	selectedAgentId,
	onAgentChange,
	selectionLabel,
	canClearSelection = false,
	onClearSelection,
	placeholder,
}) => {
	const { t } = useTranslation();
	const [value, setValue] = useState('');
	const [compactChipLabels, setCompactChipLabels] = useState(false);
	const [isFocused, setIsFocused] = useState(false);
	const wrapperRef = useRef<HTMLDivElement>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const footerRef = useRef<HTMLDivElement>(null);
	const chipMeasureRef = useRef<HTMLDivElement>(null);
	const sendButtonRef = useRef<HTMLButtonElement>(null);

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
	const hasFooterChips = Boolean(agentLabel || selectionLabel);

	const updateChipLayout = useCallback(() => {
		const footerEl = footerRef.current;
		const chipMeasureEl = chipMeasureRef.current;
		const sendButtonEl = sendButtonRef.current;

		if (!footerEl || !chipMeasureEl || !sendButtonEl || !hasFooterChips) {
			setCompactChipLabels(false);
			return;
		}

		const availableWidth = footerEl.clientWidth - sendButtonEl.offsetWidth - 24;
		setCompactChipLabels(chipMeasureEl.scrollWidth > Math.max(0, availableWidth));
	}, [hasFooterChips]);

	useEffect(() => {
		updateChipLayout();
	}, [agentLabel, selectionLabel, updateChipLayout]);

	useEffect(() => {
		const footerEl = footerRef.current;

		if (!footerEl || typeof ResizeObserver === 'undefined') {
			return;
		}

		const observer = new ResizeObserver(() => {
			updateChipLayout();
		});

		observer.observe(footerEl);

		if (sendButtonRef.current) {
			observer.observe(sendButtonRef.current);
		}

		if (chipMeasureRef.current) {
			observer.observe(chipMeasureRef.current);
		}

		return () => {
			observer.disconnect();
		};
	}, [updateChipLayout]);

	const renderAgentTrigger = (compact: boolean) => (
		<AppDropdownMenu>
			<AppDropdownMenuTrigger asChild>
				<AppButton
					type="button"
					variant="ghost"
					size="sm"
					className={`h-7 rounded-full border border-border/80 bg-background/75 text-xs text-foreground/80 shadow-none hover:border-foreground/15 hover:bg-accent/70 hover:text-foreground dark:border-border/90 dark:bg-background/50 dark:text-foreground/90 dark:hover:bg-accent/80 ${
						compact ? 'gap-1 px-2' : 'max-w-[10rem] min-w-0 px-2.5'
					}`}
					disabled={disabled}
					aria-label={t('agenticPanel.agentSelect', 'Select agent')}
					title={agentLabel}
				>
					<Search className="h-3 w-3" aria-hidden="true" />
					{compact ? null : <span className="min-w-0 truncate">{agentLabel}</span>}
					<ChevronDown className="h-3 w-3 opacity-70" aria-hidden="true" />
				</AppButton>
			</AppDropdownMenuTrigger>
			<AppDropdownMenuContent
				align="start"
				className="min-w-40 rounded-xl border-border/80 bg-card shadow-none dark:border-border/90 dark:bg-card/95"
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
	);

	const renderSelectionChip = (compact: boolean) => {
		if (!selectionLabel) return null;
		if (compact && !canClearSelection) return null;

		return (
			<div
				className={`flex items-center rounded-full border border-border/80 bg-background/75 py-1 text-xs text-foreground/72 shadow-none dark:border-border/90 dark:bg-background/50 dark:text-muted-foreground/95 ${
					compact ? 'gap-1 px-2' : 'max-w-[11.5rem] gap-1 px-2.5'
				}`}
				title={selectionLabel}
				aria-label={selectionLabel}
			>
				{compact ? null : <span className="min-w-0 truncate">{selectionLabel}</span>}
				{canClearSelection ? (
					<button
						type="button"
						onMouseDown={(event) => event.preventDefault()}
						onClick={onClearSelection}
						className="shrink-0 rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-accent/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-muted-foreground/95 dark:hover:bg-accent/80 dark:hover:text-foreground"
						aria-label={t('agenticPanel.clearSelection', 'Clear selection')}
					>
						<X className="h-3 w-3" aria-hidden="true" />
					</button>
				) : null}
			</div>
		);
	};

	const handleWrapperBlur = useCallback((e: React.FocusEvent<HTMLDivElement>) => {
		if (wrapperRef.current?.contains(e.relatedTarget as Node | null)) return;
		setIsFocused(false);
	}, []);

	return (
		<div className="px-3 pb-3 pt-1 shrink-0">
			<div
				ref={wrapperRef}
				onBlur={handleWrapperBlur}
				className={`relative overflow-hidden rounded-[1.4rem] border bg-card/95 text-card-foreground ring-1 ring-black/6 shadow-none backdrop-blur-sm transition-[border-color,background-color] duration-200 ${
					isFocused
						? 'border-primary/45 dark:border-primary/55'
						: 'border-border/85 hover:border-foreground/15 dark:border-border/90 dark:hover:border-foreground/15'
				} dark:bg-card/95 dark:ring-[hsl(var(--border)/0.55)]`}
			>
				<div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-primary/12 via-primary/5 to-transparent" />
				<div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
				<AppTextarea
					ref={textareaRef}
					value={value}
					onChange={handleChange}
					onKeyDown={handleKeyDown}
					onFocus={() => setIsFocused(true)}
					disabled={disabled}
					rows={3}
					placeholder={
						placeholder ??
						t('agenticPanel.inputPlaceholder', 'Ask the assistant for context, facts, or ideas')
					}
					aria-label={t('agenticPanel.inputAriaLabel', 'Chat message input')}
					className="w-full resize-none border-none bg-transparent px-4 pt-4 pb-3 text-sm leading-6 text-foreground placeholder:text-foreground/45 shadow-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 dark:placeholder:text-muted-foreground/80"
				/>

				{hasFooterChips ? (
					<div
						ref={chipMeasureRef}
						aria-hidden="true"
						className="pointer-events-none absolute left-3.5 top-0 -z-10 inline-flex w-max items-center gap-2 opacity-0"
					>
						{agentLabel ? renderAgentTrigger(false) : null}
						{renderSelectionChip(false)}
					</div>
				) : null}

				<div
					ref={footerRef}
					className="flex items-center gap-2 border-t border-border/70 bg-muted/45 px-3.5 py-2.5 dark:border-border/80 dark:bg-muted/20"
				>
					{hasFooterChips ? (
						<div className="flex min-w-0 items-center gap-2 overflow-hidden">
							{agentLabel ? renderAgentTrigger(compactChipLabels) : null}
							{renderSelectionChip(compactChipLabels)}
						</div>
					) : null}

					<div className="flex-1" />

					<AppButton
						ref={sendButtonRef}
						type="button"
						variant={canSend ? 'default' : 'ghost'}
						size="icon"
						onClick={handleSend}
						disabled={!canSend}
						aria-label={t('agenticPanel.send', 'Send message')}
						className={`h-7 w-7 rounded-full shadow-none transition-colors ${
							canSend
								? 'bg-foreground text-background hover:bg-foreground/90 dark:bg-foreground dark:text-background dark:hover:bg-foreground/95'
								: 'text-muted-foreground hover:bg-accent/80 hover:text-foreground dark:text-muted-foreground/90 dark:hover:bg-accent/80 dark:hover:text-foreground'
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
