import React, { useCallback, useState } from 'react';
import { Sparkles } from 'lucide-react';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from '@/components/ui/Dialog';
import { AppLabel } from '@/components/app/AppLabel';
import { AppTextarea } from '@/components/app/AppTextarea';
import { AppButton } from '@/components/app/AppButton';
import { AppBadge } from '@/components/app/AppBadge';

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
}: AIPromptDialogProps): React.JSX.Element {
	const [prompt, setPrompt] = useState('');

	const handleSubmit = useCallback(() => {
		if (prompt.trim()) {
			onSubmit(prompt);
			setPrompt('');
		}
	}, [prompt, onSubmit]);

	const handleOpenChange = useCallback(
		(open: boolean) => {
			if (!open && !isProcessing) onClose();
		},
		[isProcessing, onClose]
	);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
			if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
				handleSubmit();
			}
		},
		[handleSubmit]
	);

	return (
		<Dialog open={isOpen} onOpenChange={handleOpenChange}>
			<DialogContent className="max-w-md border-border bg-card">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 text-sm font-semibold">
						<Sparkles className="h-4 w-4 text-amber-500" />
						Edit with AI
					</DialogTitle>
				</DialogHeader>

				{/* Prompt Input */}
				<div className="flex flex-col gap-2">
					<AppLabel htmlFor="ai-prompt" className="text-xs text-muted-foreground">
						Describe what you'd like to change:
					</AppLabel>
					<AppTextarea
						id="ai-prompt"
						value={prompt}
						onChange={(e) => setPrompt(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="e.g., make it black and white, add blur, brighten it..."
						disabled={isProcessing}
						className="h-20 resize-none text-xs"
					/>
				</div>

				{/* Example Prompts */}
				<div className="flex flex-col gap-1.5">
					<AppLabel className="text-xs text-muted-foreground">Try these:</AppLabel>
					<div className="flex flex-wrap gap-1.5">
						{EXAMPLE_PROMPTS.map((example) => (
							<button
								key={example}
								onClick={() => setPrompt(example)}
								disabled={isProcessing}
								className="cursor-pointer rounded-full border border-border/50 bg-muted px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-border hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
							>
								{example}
							</button>
						))}
					</div>
				</div>

				{/* Note */}
				<AppBadge
					variant="secondary"
					className="w-full justify-start rounded-sm text-xs font-normal text-muted-foreground"
				>
					✨ Supports: black & white, blur, brightness, vibrant, sepia, invert, sharpen
				</AppBadge>

				<DialogFooter className="gap-2 sm:gap-2">
					<AppButton
						variant="outline"
						size="sm"
						onClick={onClose}
						disabled={isProcessing}
						className="flex-1 text-xs"
					>
						Cancel
					</AppButton>
					<AppButton
						size="sm"
						onClick={handleSubmit}
						disabled={!prompt.trim() || isProcessing}
						className="flex-1 text-xs"
					>
						{isProcessing ? 'Processing...' : 'Apply'}
					</AppButton>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
