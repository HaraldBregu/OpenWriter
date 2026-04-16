import type { ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PenLine, Bot, FolderOpen } from 'lucide-react';
import { useCreateWriting } from '@/hooks/use-create-writing';
import { CategoryCard } from './CategoryCard';

export function QuickActions(): ReactElement {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { createWriting, isCreating } = useCreateWriting();

	return (
		<section className="space-y-3">
			<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
				{t('home.quickActions', 'Quick actions')}
			</p>
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
				<CategoryCard
					icon={PenLine}
					labelKey="home.writing"
					descriptionKey="home.writingDescription"
					accent="bg-foreground/8 text-foreground"
					onClick={createWriting}
					disabled={isCreating}
				/>
				<CategoryCard
					icon={FolderOpen}
					labelKey="home.documents"
					descriptionKey="home.documentsDescription"
					accent="bg-muted text-foreground"
					onClick={() => navigate('/resources/documents')}
				/>
				<CategoryCard
					icon={Bot}
					labelKey="common.agents"
					descriptionKey="home.chatDescription"
					accent="bg-secondary text-foreground"
					onClick={() => navigate('/agents')}
				/>
			</div>
		</section>
	);
}
