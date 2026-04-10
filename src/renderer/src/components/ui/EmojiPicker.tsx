import React, { useCallback } from 'react';
import { EmojiPicker as FrimousseEmojiPicker } from 'frimousse';
import type { Emoji } from 'frimousse';
import { Smile } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/Popover';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface EmojiPickerProps {
	readonly onSelect: (emoji: string) => void;
	readonly value?: string;
	readonly className?: string;
}

const EMOJI_COLUMNS = 8;
const EMOJI_BUTTON_SIZE_PX = 48;
const PICKER_PADDING_PX = 16;
const PICKER_WIDTH_PX = EMOJI_COLUMNS * EMOJI_BUTTON_SIZE_PX + PICKER_PADDING_PX;

const EmojiPickerComponent: React.FC<EmojiPickerProps> = ({ onSelect, value, className }) => {
	const handleEmojiSelect = useCallback(
		(emoji: Emoji) => {
			onSelect(emoji.emoji);
		},
		[onSelect]
	);

	return (
		<Popover>
			<PopoverTrigger
				render={
					<Button
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
					</Button>
				}
			/>
			<PopoverContent className="w-auto p-0" align="start" sideOffset={6} aria-label="Emoji picker">
				<FrimousseEmojiPicker.Root
					onEmojiSelect={handleEmojiSelect}
					columns={EMOJI_COLUMNS}
					className="h-[400px] rounded-md bg-popover p-2"
					style={{ width: `${PICKER_WIDTH_PX}px` }}
				>
					<FrimousseEmojiPicker.Search
						className="mb-2 h-8 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-none outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
						placeholder="Search emoji..."
						aria-label="Search emoji"
					/>
					<FrimousseEmojiPicker.Viewport className="h-[calc(100%-2.5rem)] overflow-y-auto">
						<FrimousseEmojiPicker.Loading className="flex h-full items-center justify-center text-sm text-muted-foreground">
							Loading...
						</FrimousseEmojiPicker.Loading>
						<FrimousseEmojiPicker.Empty className="flex h-full items-center justify-center text-sm text-muted-foreground">
							{({ search }) => <>No emoji found for &ldquo;{search}&rdquo;</>}
						</FrimousseEmojiPicker.Empty>
						<FrimousseEmojiPicker.List
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
											'flex h-12 w-12 items-center justify-center rounded text-3xl transition-colors',
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
					</FrimousseEmojiPicker.Viewport>
				</FrimousseEmojiPicker.Root>
			</PopoverContent>
		</Popover>
	);
};

export { EmojiPickerComponent as EmojiPicker };
export type { EmojiPickerProps };
