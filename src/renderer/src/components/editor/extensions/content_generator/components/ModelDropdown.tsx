import React from 'react';
import { ChevronDown } from 'lucide-react';
import { AppButton } from '@components/app/AppButton';
import {
	AppDropdownMenu,
	AppDropdownMenuTrigger,
	AppDropdownMenuContent,
	AppDropdownMenuItem,
} from '@components/app/AppDropdownMenu';
import { cn } from '@/lib/utils';
import type { ModelInfo } from '../../../../../../../shared/types';

interface ModelDropdownProps {
	models: readonly ModelInfo[];
	selectedModel: ModelInfo;
	disabled: boolean;
	onModelChange: (model: ModelInfo) => void;
}

export function ModelDropdown({
	models,
	selectedModel,
	disabled,
	onModelChange,
}: ModelDropdownProps): React.JSX.Element {
	const { t } = useTranslation();

	return (
		<AppDropdownMenu modal={false}>
			<AppDropdownMenuTrigger asChild>
				<AppButton
					type="button"
					variant="ghost"
					size="sm"
					disabled={disabled}
					className="h-10 min-w-0 flex-1 justify-start gap-2.5 rounded-[1.15rem] border border-border/75 bg-background/78 px-3 py-2 text-left shadow-[0_1px_0_hsl(var(--background)/0.92)_inset,0_4px_12px_hsl(var(--foreground)/0.04)] hover:border-foreground/15 hover:bg-background dark:border-white/12 dark:bg-white/[0.04] dark:shadow-[0_1px_0_hsl(var(--foreground)/0.05)_inset,0_6px_14px_hsl(var(--background)/0.28)] dark:hover:border-white/16 dark:hover:bg-white/[0.05]"
					onMouseDown={(e) => {
						e.preventDefault();
						e.stopPropagation();
					}}
				>
					<span className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
						<span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground dark:text-muted-foreground/95">
							{t('assistantNode.model', 'Model')}
						</span>
						<span className="truncate text-sm font-semibold text-foreground">
							{selectedModel.name}
						</span>
					</span>
					<ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80" />
				</AppButton>
			</AppDropdownMenuTrigger>
			<AppDropdownMenuContent
				align="start"
				side="top"
				sideOffset={8}
				className="z-[120] max-h-[280px] min-w-[220px] overflow-y-auto rounded-2xl border border-border/75 bg-background/95 p-1.5 shadow-[0_10px_28px_hsl(var(--foreground)/0.1)] backdrop-blur-xl dark:border-white/12 dark:bg-background/88 dark:shadow-[0_14px_34px_hsl(var(--background)/0.58)]"
			>
				{models.map((model) => (
					<AppDropdownMenuItem
						key={model.modelId}
						onSelect={() => onModelChange(model)}
						className={cn(
							'rounded-xl px-2.5 py-2.5',
							selectedModel.modelId === model.modelId && 'bg-accent text-accent-foreground'
						)}
					>
						<div className="flex min-w-0 flex-col gap-0.5">
							<span className="truncate text-sm font-medium">{model.name}</span>
							<span className="text-xs text-muted-foreground">{model.provider}</span>
						</div>
					</AppDropdownMenuItem>
				))}
			</AppDropdownMenuContent>
		</AppDropdownMenu>
	);
}
