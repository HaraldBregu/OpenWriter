import React from 'react';
import { useTranslation } from 'react-i18next';
import { ImageIcon, PenLine } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ContentGeneratorAgentId } from '../agents';

interface PromptHeaderProps {
	agentId: ContentGeneratorAgentId;
	modelName: string;
}

export function PromptHeader({ agentId, modelName }: PromptHeaderProps): React.JSX.Element {
	const { t } = useTranslation();
	const isImage = agentId === 'image';
	const modeLabel = isImage
		? t('assistantAgent.image', 'Image')
		: t('assistantAgent.writer', 'Text');
	const modeDescription = isImage
		? t('assistantNode.imageHeaderSubtitle', 'Prompt or references')
		: t('assistantNode.textHeaderSubtitle', 'Draft, rewrite, continue');

	return (
		<div className="flex min-h-[3.1rem] items-center justify-between gap-3 px-4 py-4">
			<div className="flex min-w-0 items-center gap-2.5">
				<div
					className={cn(
						'flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl border shadow-[0_1px_0_hsl(var(--background)/0.92)_inset,0_4px_10px_hsl(var(--foreground)/0.04)]',
						isImage
							? 'border-primary/20 bg-primary/10 text-primary dark:border-primary/25 dark:bg-primary/12'
							: 'border-border/70 bg-background/78 text-foreground dark:border-white/12 dark:bg-white/[0.04]'
					)}
				>
					{isImage ? <ImageIcon className="h-4 w-4" /> : <PenLine className="h-4 w-4" />}
				</div>
				<div className="flex min-w-0 flex-col gap-1">
					<span className="truncate text-sm font-semibold leading-none text-foreground">
						{modeLabel}
					</span>
					<span className="truncate text-[11px] font-medium leading-none text-muted-foreground dark:text-muted-foreground/95">
						{modeDescription}
					</span>
				</div>
			</div>
			<div
				className="flex max-w-[58%] shrink-0 items-center truncate rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-[11px] font-medium leading-none text-foreground shadow-[0_1px_0_hsl(var(--background)/0.92)_inset,0_4px_10px_hsl(var(--foreground)/0.04)] dark:border-white/12 dark:bg-white/[0.04] dark:text-foreground dark:shadow-[0_1px_0_hsl(var(--foreground)/0.05)_inset,0_6px_14px_hsl(var(--background)/0.28)]"
				aria-label={t('assistantNode.selectedModelAria', 'Selected model: {{modelName}}', {
					modelName,
				})}
			>
				{modelName}
			</div>
		</div>
	);
}
