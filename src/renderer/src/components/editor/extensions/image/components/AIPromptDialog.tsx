import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
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

export function AIPromptDialog({
	isOpen,
	onClose,
	onSubmit,
	isProcessing = false,
}: AIPromptDialogProps): React.JSX.Element {
	const { t } = useTranslation();
	const [prompt, setPrompt] = useState('');

	const examplePrompts: string[] = t('imageNode.aiExamples', { returnObjects: true }) as string[];

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
						{t('imageNode.aiEditTitle')}
					</DialogTitle>
				</DialogHeader>

				{/* Prompt Input */}
				<div className="flex flex-col gap-2">
					<AppLabel htmlFor="ai-prompt" className="text-xs text-muted-foreground">
						{t('imageNode.aiPromptLabel')}
					</AppLabel>
					<AppTextarea
						id="ai-prompt"
						value={prompt}
						onChange={(e) => setPrompt(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder={t('imageNode.aiPromptPlaceholder')}
						disabled={isProcessing}
						className="h-20 resize-none text-xs"
					/>
				</div>

				{/* Example Prompts */}
				<div className="flex flex-col gap-1.5">
					<AppLabel className="text-xs text-muted-foreground">
						{t('imageNode.aiExamplesLabel')}
					</AppLabel>
					<div className="flex flex-wrap gap-1.5">
						{Array.isArray(examplePrompts) &&
							examplePrompts.map((example) => (
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
					{t('imageNode.aiSupportedFilters')}
				</AppBadge>

				<DialogFooter className="gap-2 sm:gap-2">
					<AppButton
						variant="outline"
						size="sm"
						onClick={onClose}
						disabled={isProcessing}
						className="flex-1 text-xs"
					>
						{t('imageNode.cancel')}
					</AppButton>
					<AppButton
						size="sm"
						onClick={handleSubmit}
						disabled={!prompt.trim() || isProcessing}
						className="flex-1 text-xs"
					>
						{isProcessing ? t('imageNode.aiProcessing') : t('imageNode.aiApply')}
					</AppButton>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
