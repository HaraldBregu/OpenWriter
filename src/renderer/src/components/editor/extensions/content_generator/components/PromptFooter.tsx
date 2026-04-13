import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUp, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CardFooter } from '@/components/ui/Card';

import { AgentDropdown } from './AgentDropdown';
import { ModelDropdown } from './ModelDropdown';
import type { ContentGeneratorAgentId } from '../agents';
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

	return (
		<CardFooter className="border-t border-border/65 bg-[linear-gradient(180deg,hsl(var(--muted)/0.2)_0%,hsl(var(--background)/0.18)_100%)] px-4 py-3.5 dark:border-white/10 dark:bg-[linear-gradient(180deg,hsl(var(--muted)/0.12)_0%,hsl(var(--background)/0.14)_100%)]">
			<div className="flex items-center gap-2">
				<AgentDropdown agentId={agentId} disabled={loading} onAgentChange={onAgentChange} />
				<ModelDropdown
					models={modelOptions}
					selectedModel={selectedModel}
					disabled={loading}
					onModelChange={handleModelChange}
				/>
				<div className="ml-auto shrink-0">
					<Button
						variant="prompt-submit"
						size="prompt-submit-md"
						className="h-10 w-10 shrink-0 rounded-full shadow-[0_10px_22px_hsl(var(--primary)/0.18)] dark:shadow-[0_12px_24px_hsl(var(--primary)/0.2)]"
						disabled={isSubmitDisabled}
						onMouseDown={(e) => e.preventDefault()}
						onClick={() => {
							if (!loading) submitRef.current?.();
						}}
						aria-label={t('agenticPanel.send', 'Send message')}
					>
						{loading ? <LoaderCircle className="animate-spin" /> : <ArrowUp />}
					</Button>
				</div>
			</div>
		</CardFooter>
	);
}
