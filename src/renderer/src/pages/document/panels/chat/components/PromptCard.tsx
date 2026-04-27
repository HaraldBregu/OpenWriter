import React from 'react';
import { useTranslation } from 'react-i18next';
import { ImagePlus, Paperclip, SendHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/Card';
import { MovingShadow } from '@/components/ui/MovingShadow';
import { Textarea } from '@/components/ui/Textarea';
import { cn } from '@/lib/utils';

interface PromptCardProps {
	readonly value: string;
	readonly disabled: boolean;
	readonly isFocused: boolean;
	readonly isDragOver: boolean;
	readonly canSend: boolean;
	readonly previewUrls: readonly string[];
	readonly fileNames: readonly string[];
	readonly selectionLabel?: string | null;
	readonly canClearSelection: boolean;
	readonly placeholder?: string;

	readonly wrapperRef: React.RefObject<HTMLDivElement | null>;
	readonly textareaRef: React.RefObject<HTMLTextAreaElement | null>;

	readonly onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
	readonly onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
	readonly onFocus: () => void;
	readonly onWrapperBlur: (e: React.FocusEvent<HTMLDivElement>) => void;
	readonly onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
	readonly onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
	readonly onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
	readonly onSend: () => void;
	readonly onOpenFilePicker: () => void;
	readonly onRemoveImage: (e: React.MouseEvent<HTMLButtonElement>) => void;
	readonly onClearSelection?: () => void;
}

const PromptCard: React.FC<PromptCardProps> = ({
	value,
	disabled,
	isFocused,
	isDragOver,
	canSend,
	previewUrls,
	fileNames,
	selectionLabel,
	canClearSelection,
	placeholder,
	wrapperRef,
	textareaRef,
	onChange,
	onKeyDown,
	onFocus,
	onWrapperBlur,
	onDragOver,
	onDragLeave,
	onDrop,
	onSend,
	onOpenFilePicker,
	onRemoveImage,
	onClearSelection,
}) => {
	const { t } = useTranslation();

	return (
		<div className="relative my-2 w-full">
			<div
				aria-hidden="true"
				className={cn(
					'pointer-events-none absolute inset-x-6 top-8 bottom-0 -z-10 rounded-full opacity-60 blur-2xl transition-opacity duration-300',
					'bg-[radial-gradient(circle_at_12%_50%,hsl(195_96%_61%/0.26),transparent_32%),radial-gradient(circle_at_50%_100%,hsl(30_95%_61%/0.28),transparent_38%),radial-gradient(circle_at_88%_45%,hsl(270_91%_68%/0.24),transparent_32%)]',
					'dark:bg-[radial-gradient(circle_at_12%_50%,hsl(195_96%_61%/0.22),transparent_32%),radial-gradient(circle_at_50%_100%,hsl(30_95%_61%/0.26),transparent_38%),radial-gradient(circle_at_88%_45%,hsl(270_91%_68%/0.26),transparent_32%)]',
					isFocused && 'opacity-85',
					isDragOver && 'opacity-100'
				)}
			/>
			<MovingShadow
				borderRadius="1rem"
				shadowSize="40px"
				duration={7800}
				shadowClassName="h-40 w-40 opacity-60"
			>
			<MovingBorderButton
				as="div"
				borderRadius="1rem"
				duration={6200}
				containerClassName="h-auto w-full text-sm"
				borderClassName="h-24 w-24 bg-[radial-gradient(circle,_#38bdf8_8%,_#34d399_32%,_#fb7185_56%,_transparent_72%)] opacity-[0.92]"
				className="block border-none bg-transparent p-0 text-inherit backdrop-blur-none"
			>
				<Card
					ref={wrapperRef}
					onBlur={onWrapperBlur}
					onDragOver={onDragOver}
					onDragLeave={onDragLeave}
					onDrop={onDrop}
					className={cn(
						'w-full shadow-[0_12px_32px_hsl(var(--foreground)/0.06)]! dark:shadow-[0_20px_48px_hsl(var(--background)/0.42)]!',
						isDragOver && 'bg-primary/5 dark:bg-primary/10'
					)}
				>
				{(previewUrls.length > 0 || selectionLabel) && (
					<CardHeader className="space-y-0 p-0 px-3.5">
						{previewUrls.length > 0 && (
							<div
								role="list"
								aria-label={t('agenticPanel.attachedImages', 'Attached reference images')}
								className="flex items-center gap-2 overflow-x-auto pb-1 pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
							>
								{previewUrls.map((url, index) => {
									const fileName = fileNames[index] ?? '';
									return (
										<div key={url} role="listitem" className="group/thumb relative shrink-0">
											<div className="h-14 w-14 overflow-hidden rounded-xl border border-border/70 bg-muted/30 dark:border-white/12 dark:bg-white/[0.04]">
												<img src={url} alt={fileName} className="h-full w-full object-cover" />
											</div>
											<button
												type="button"
												data-index={index}
												className="absolute -right-1.5 -top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-border/70 bg-background text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover/thumb:opacity-100 group-focus-within/thumb:opacity-100 dark:border-white/12 dark:bg-background"
												onMouseDown={(e) => e.preventDefault()}
												onClick={onRemoveImage}
												aria-label={
													fileName
														? t('assistantNode.removeNamedImage', 'Remove {{name}}', {
																name: fileName,
															})
														: t('assistantNode.removeImage', 'Remove image')
												}
											>
												<X className="h-2.5 w-2.5" aria-hidden="true" />
											</button>
										</div>
									);
								})}
								<button
									type="button"
									role="listitem"
									className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-dashed border-border/80 bg-background/60 text-muted-foreground transition-colors hover:border-foreground/18 hover:bg-background hover:text-foreground dark:border-white/14 dark:bg-white/[0.03] dark:hover:border-white/18 dark:hover:bg-white/[0.05]"
									disabled={disabled}
									onMouseDown={(e) => e.preventDefault()}
									onClick={onOpenFilePicker}
									aria-label={t('assistantNode.addImage', 'Add image')}
								>
									<ImagePlus className="h-4 w-4" aria-hidden="true" />
								</button>
							</div>
						)}

						{selectionLabel && (
							<div className="flex items-center gap-2 pb-1 pt-3">
								<div
									className="flex max-w-[11.5rem] items-center gap-1 rounded-full border border-border/80 bg-background/75 px-2.5 py-1 text-xs text-foreground/72 shadow-none dark:border-border/90 dark:bg-background/50 dark:text-muted-foreground/95"
									title={selectionLabel}
								>
									<span className="min-w-0 truncate">{selectionLabel}</span>
									{canClearSelection && (
										<button
											type="button"
											onMouseDown={(e) => e.preventDefault()}
											onClick={onClearSelection}
											className="shrink-0 rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-accent/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-muted-foreground/95 dark:hover:bg-accent/80 dark:hover:text-foreground"
											aria-label={t('agenticPanel.clearSelection', 'Clear selection: {{label}}', {
												label: selectionLabel,
											})}
										>
											<X className="h-3 w-3" aria-hidden="true" />
										</button>
									)}
								</div>
							</div>
						)}
					</CardHeader>
				)}

				<CardContent>
					<Textarea
						ref={textareaRef}
						data-chat-input=""
						value={value}
						onChange={onChange}
						onKeyDown={onKeyDown}
						onFocus={onFocus}
						disabled={disabled}
						rows={1}
						placeholder={
							placeholder ??
							t('agenticPanel.inputPlaceholder', 'Ask the assistant for context, facts, or ideas')
						}
						aria-label={t('agenticPanel.inputAriaLabel', 'Chat message input')}
						className={cn(
							'disabled:bg-transparent! disabled:focus:bg-transparent!',
							'p-0 rounded-none w-full resize-none border-none bg-transparent dark:bg-transparent focus:bg-transparent text-[15px] leading-7 text-foreground shadow-none focus-visible:ring-0 focus-visible:ring-offset-0',
							'placeholder:text-foreground/42 dark:placeholder:text-muted-foreground/78',
							'disabled:cursor-not-allowed disabled:opacity-60'
						)}
					/>
				</CardContent>

				<CardFooter className="bg-transparent border-none">
					<Button
						type="button"
						variant="outline"
						size="icon"
						disabled={disabled}
						onMouseDown={(e) => e.preventDefault()}
						onClick={onOpenFilePicker}
						title={t('assistantNode.addAttachment', 'Add attachment')}
						aria-label={t('assistantNode.addAttachment', 'Add attachment')}
					>
						<Paperclip />
					</Button>
					<Button
						variant="default"
						className="ml-auto shrink-0"
						disabled={!canSend}
						onMouseDown={(e) => e.preventDefault()}
						onClick={onSend}
						aria-label={t('agenticPanel.submit', 'Submit')}
					>
						<SendHorizontal />
						<span>{t('agenticPanel.submit', 'Submit')}</span>
					</Button>
				</CardFooter>
				</Card>
			</MovingBorderButton>
			</MovingShadow>
		</div>
	);
};

export { PromptCard };
export type { PromptCardProps };
