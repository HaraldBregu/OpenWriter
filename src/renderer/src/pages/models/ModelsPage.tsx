import React from 'react';
import { useTranslation } from 'react-i18next';
import { Cpu, Plus } from 'lucide-react';
import { AppButton } from '../../components/app';

// ------------------------------------------------------------------
// Empty state
// ------------------------------------------------------------------

const ModelsEmptyState: React.FC = () => {
	const { t } = useTranslation();

	return (
		<div className="flex flex-col items-center justify-center flex-1 gap-4 text-center px-6 py-16">
			<div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted">
				<Cpu className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
			</div>
			<div className="space-y-1 max-w-xs">
				<p className="text-sm font-medium text-foreground">
					{t('models.emptyTitle', 'No models registered')}
				</p>
				<p className="text-xs text-muted-foreground">
					{t('models.emptyDescription', 'Register a model to make it available in your workspace.')}
				</p>
			</div>
		</div>
	);
};

// ------------------------------------------------------------------
// Page
// ------------------------------------------------------------------

const ModelsPage: React.FC = () => {
	const { t } = useTranslation();

	return (
		<div className="flex flex-col h-full">
			{/* Header */}
			<div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
				<div>
					<h1 className="text-sm font-semibold text-foreground">{t('models.title', 'Models')}</h1>
					<p className="text-xs text-muted-foreground mt-0.5">
						{t('models.subtitle', 'Manage the AI models registered in your workspace.')}
					</p>
				</div>
				<AppButton type="button" size="sm" className="gap-1.5">
					<Plus className="h-3.5 w-3.5" aria-hidden="true" />
					{t('models.registerModel', 'Register Model')}
				</AppButton>
			</div>

			{/* Content */}
			<div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
				<ModelsEmptyState />
			</div>
		</div>
	);
};

export default ModelsPage;
