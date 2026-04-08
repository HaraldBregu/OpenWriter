import React, { useCallback } from 'react';
import { EmojiPicker } from 'frimousse';
import type { Emoji } from 'frimousse';
import { Smile } from 'lucide-react';
import { AppPopover, AppPopoverTrigger, AppPopoverContent } from './AppPopover';
import { AppButton } from './AppButton';
import { cn } from '@/lib/utils';

interface AppEmojiPickerProps {
	readonly onSelect: (emoji: string) => void;
	readonly value?: string;
	readonly className?: string;
}

const EMOJI_COLUMNS = 8;
const EMOJI_BUTTON_SIZE_PX = 40;
const PICKER_PADDING_PX = 16;
const PICKER_WIDTH_PX = EMOJI_COLUMNS * EMOJI_BUTTON_SIZE_PX + PICKER_PADDING_PX;

const AppEmojiPicker: React.FC<AppEmojiPickerProps> = ({ onSelect, value, className }) => {
	const handleEmojiSelect = useCallback(
		(emoji: Emoji) => {
			onSelect(emoji.emoji);
		},
		[onSelect]
	);

	return (
		<AppPopover>
			<AppPopoverTrigger asChild>
				<AppButton
					type="button"
					variant="header-icon"
					size="header-icon-lg"
					aria-label="Select emoji"
					title="Select emoji"
					className={cn('shrink-0 text-2xl leading-none', className)}
				>
					{value ? (
						<span aria-hidden="true" className="text-2xl leading-none">
							{value}
						</span>
					) : (
						<Smile aria-hidden="true" />
					)}
				</AppButton>
			</AppPopoverTrigger>
			<AppPopoverContent
				className="w-auto p-0"
				align="start"
				sideOffset={6}
				aria-label="Emoji picker"
			>
				<EmojiPicker.Root
					onEmojiSelect={handleEmojiSelect}
					columns={EMOJI_COLUMNS}
					className="h-[340px] rounded-md bg-popover p-2"
					style={{ width: `${PICKER_WIDTH_PX}px` }}
				>
					<EmojiPicker.Search
						className="mb-2 h-8 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-none outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
						placeholder="Search emoji…"
						aria-label="Search emoji"
					/>
					<EmojiPicker.Viewport className="h-[calc(100%-2.5rem)] overflow-y-auto">
						<EmojiPicker.Loading className="flex h-full items-center justify-center text-sm text-muted-foreground">
							Loading…
						</EmojiPicker.Loading>
						<EmojiPicker.Empty className="flex h-full items-center justify-center text-sm text-muted-foreground">
							{({ search }) => <>No emoji found for &ldquo;{search}&rdquo;</>}
						</EmojiPicker.Empty>
						<EmojiPicker.List
							className="select-none"
							components={{
								CategoryHeader: ({ category, ...props }) => (
									<div {...props} className="px-1 py-1 text-xs font-medium text-muted-foreground">
										{category.label}
									</div>
								),
								Row: ({ children, ...props }) => (
									<div {...props} className="flex">
										{children}
									</div>
								),
								Emoji: ({ emoji, ...props }) => (
									<button
										{...props}
										type="button"
										aria-label={emoji.label}
										className={cn(
											'flex h-10 w-10 items-center justify-center rounded text-2xl transition-colors',
											emoji.isActive
												? 'bg-accent text-accent-foreground'
												: 'hover:bg-accent hover:text-accent-foreground'
										)}
									>
										{emoji.emoji}
									</button>
								),
							}}
						/>
					</EmojiPicker.Viewport>
				</EmojiPicker.Root>
			</AppPopoverContent>
		</AppPopover>
	);
};

AppEmojiPicker.displayName = 'AppEmojiPicker';

export { AppEmojiPicker };
export type { AppEmojiPickerProps };
