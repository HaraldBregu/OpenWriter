import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppButton } from '@/components/app/AppButton';
import {
	AppTooltip,
	AppTooltipTrigger,
	AppTooltipContent,
} from '@/components/app/AppTooltip';

interface AIPromptDialogProps {
	isOpen: boolean;
	onClose: () => void;
	onSubmit: (prompt: string) => void;
	isProcessing?: boolean;
}

const EXAMPLE_PROMPTS = [
	'Make it black and white',
	'Add a blur effect',
	'Increase brightness',
	'Make colors more vibrant',
	'Apply sepia tone',
	'Invert colors',
	'Sharpen the image',
];

export function AIPromptDialog({
	isOpen,
	onClose,
	onSubmit,
	isProcessing = false,
}: AIPromptDialogProps): React.JSX.Element | null {
	const { t } = useTranslation();
	const [prompt, setPrompt] = useState('');

	const handleSubmit = useCallback(() => {
		if (prompt.trim()) {
			onSubmit(prompt);
			setPrompt('');
		}
	}, [prompt, onSubmit]);

	const handleExampleClick = useCallback(
		(example: string) => {
			setPrompt(example);
		},
		[]
	);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
			if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
				handleSubmit();
			}
		},
		[handleSubmit]
	);

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
			<div className="w-full max-w-md rounded-lg border border-border bg-card p-4 shadow-lg">
				{/* Header */}
				<div className="mb-3 flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Sparkles className="h-4 w-4 text-amber-500" />
						<h2 className="text-sm font-semibold">Edit with AI</h2>
					</div>
					<AppButton
						variant="ghost"
						size="icon-xs"
						onClick={onClose}
						disabled={isProcessing}
						className="h-5 w-5 [&_svg]:h-3 [&_svg]:w-3"
					>
						<X />
					</AppButton>
				</div>

				{/* Prompt Input */}
				<div className="mb-3 flex flex-col gap-2">
					<label className="text-xs font-medium text-muted-foreground" htmlFor="ai-prompt">
						Describe what you'd like to change:
					</label>
					<textarea
						id="ai-prompt"
						value={prompt}
						onChange={(e) => setPrompt(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="e.g., make it black and white, add blur, brighten it..."
						disabled={isProcessing}
						className={cn(
							'h-20 w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs',
							'text-foreground placeholder:text-muted-foreground',
							'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
							'resize-none',
							isProcessing && 'opacity-50 cursor-not-allowed'
						)}
					/>
				</div>

				{/* Example Prompts */}
				<div className="mb-4 flex flex-col gap-1.5">
					<p className="text-xs font-medium text-muted-foreground">Try these:</p>
					<div className="flex flex-wrap gap-1.5">
						{EXAMPLE_PROMPTS.map((example) => (
							<AppTooltip key={example}>
								<AppTooltipTrigger asChild>
									<button
										onClick={() => handleExampleClick(example)}
										disabled={isProcessing}
										className={cn(
											'inline-block rounded-full border border-border/50 bg-muted px-2 py-1',
											'text-xs text-muted-foreground hover:text-foreground hover:border-border',
											'transition-colors cursor-pointer',
											'disabled:opacity-50 disabled:cursor-not-allowed'
										)}
									>
										{example}
									</button>
								</AppTooltipTrigger>
								<AppTooltipContent side="bottom" className="px-2 py-1 text-xs">
									Use this example prompt
								</AppTooltipContent>
							</AppTooltip>
						))}
					</div>
				</div>

				{/* Note */}
				<div className="mb-4 rounded-sm bg-muted/50 px-2 py-1.5 text-xs text-muted-foreground">
					✨ Example transformations: black & white, blur, brightness, vibrant, sepia, invert, sharpen
				</div>

				{/* Action Buttons */}
				<div className="flex gap-2">
					<AppButton
						variant="outline"
						size="sm"
						onClick={onClose}
						disabled={isProcessing}
						className="flex-1 h-8 text-xs"
					>
						Cancel
					</AppButton>
					<AppButton
						size="sm"
						onClick={handleSubmit}
						disabled={!prompt.trim() || isProcessing}
						className="flex-1 h-8 text-xs"
					>
						{isProcessing ? 'Processing...' : 'Apply'}
					</AppButton>
				</div>
			</div>
		</div>
	);
}
