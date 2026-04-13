import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUp, ChevronDown, ImageIcon, LoaderCircle, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CardFooter } from '@/components/ui/Card';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
	DropdownMenuCheckboxItem,
} from '@/components/ui/DropdownMenu';

import type { ContentGeneratorAgentId } from '../agents';
import { getProvider } from '../../../../../../../shared/providers';
import type { ModelInfo } from '../../../../../../../shared/types';
import { IMAGE_MODELS, TEXT_MODELS } from '../../../../../../../shared/models';


interface PromptFooterProps {
	agentId: ContentGeneratorAgentId;
	selectedImageModel: ModelInfo;
	selectedTextModel: ModelInfo;
	loading: boolean;
	isSubmitDisabled: boolean;
	submitRef: React.RefObject<(() => void) | null>;
	onAgentChange: (agentId: ContentGeneratorAgentId) => void;
	onImageModelChange: (model: ModelInfo) => void;
	onTextModelChange: (model: ModelInfo) => void;
}

export function PromptFooter({
	agentId,
	selectedImageModel,
	selectedTextModel,
	loading,
	isSubmitDisabled,
	submitRef,
	onAgentChange,
	onImageModelChange,
	onTextModelChange,
}: PromptFooterProps): React.JSX.Element {
	const { t } = useTranslation();
	const isImage = agentId === 'image';
	const modelOptions = isImage ? IMAGE_MODELS : TEXT_MODELS;
	const selectedModel = isImage ? selectedImageModel : selectedTextModel;
	const handleModelChange = isImage ? onImageModelChange : onTextModelChange;

	const currentAgentLabel = isImage
		? t('assistantAgent.image', 'Image')
		: t('assistantAgent.writer', 'Text');

	return (
		<CardFooter>
			<div className="flex items-center gap-3">
				<DropdownMenu modal={false}>
					<DropdownMenuTrigger
						disabled={loading}
						render={
							<Button
								variant="outline"
								size="icon"
								title={currentAgentLabel}
								aria-label={t('assistantNode.switchAgent', 'Switch agent')}
								onMouseDown={(e) => {
									e.preventDefault();
									e.stopPropagation();
								}}
							>
								{agentId === 'image' && <ImageIcon />}
								{agentId === 'writer' && <PenLine />}
							</Button>
						}
					/>
					<DropdownMenuContent align="start" side="top" sideOffset={8} className="w-30">
						<DropdownMenuCheckboxItem
							checked={!isImage}
							onCheckedChange={() => onAgentChange('writer')}
						>
							<PenLine />
							{t('assistantAgent.writer', 'Text')}
						</DropdownMenuCheckboxItem>
						<DropdownMenuCheckboxItem
							checked={isImage}
							onCheckedChange={() => onAgentChange('image')}
						>
							<ImageIcon />
							{t('assistantAgent.image', 'Image')}
						</DropdownMenuCheckboxItem>
					</DropdownMenuContent>
				</DropdownMenu>
				<DropdownMenu modal={false}>
					<DropdownMenuTrigger
						render={
							<Button
								variant="outline"
								size="md"
								disabled={loading}
								onMouseDown={(e) => {
									e.preventDefault();
									e.stopPropagation();
								}}
							>
								<span className="truncate text-xs font-medium text-foreground">
									{selectedModel.name}
								</span>
								<ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground/80" />
							</Button>
						}
					/>
					<DropdownMenuContent align="start" side="top" sideOffset={8} className="w-50 max-h-100">
						{modelOptions.map((model) => (
							<DropdownMenuCheckboxItem
								key={model.modelId}
								checked={selectedModel.modelId === model.modelId}
								onCheckedChange={() => handleModelChange(model)}
							>
								<div className="flex min-w-0 flex-col gap-0.5">
									<span className="truncate text-sm font-medium">{model.name}</span>
									<span className="text-xs text-muted-foreground">
										{getProvider(model.providerId)?.name ?? model.providerId}
									</span>
								</div>
							</DropdownMenuCheckboxItem>

							// <DropdownMenuItem
							// 	key={model.modelId}
							// 	onSelect={() => handleModelChange(model)}
							// 	className={cn(
							// 		'rounded-xl px-2.5 py-2.5',
							// 		selectedModel.modelId === model.modelId && 'bg-accent text-accent-foreground'
							// 	)}
							// >
							// 	<div className="flex min-w-0 flex-col gap-0.5">
							// 		<span className="truncate text-sm font-medium">{model.name}</span>
							// 		<span className="text-xs text-muted-foreground">
							// 			{getProvider(model.providerId)?.name ?? model.providerId}
							// 		</span>
							// 	</div>
							// </DropdownMenuItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
			<Button
				variant="prompt-submit"
				size="icon"
				className="ml-auto shrink-0"
				disabled={isSubmitDisabled}
				onMouseDown={(e) => e.preventDefault()}
				onClick={() => {
					if (!loading) submitRef.current?.();
				}}
				aria-label={t('agenticPanel.send', 'Send message')}
			>
				{loading ? <LoaderCircle className="animate-spin" /> : <ArrowUp />}
			</Button>
		</CardFooter>
	);
}
