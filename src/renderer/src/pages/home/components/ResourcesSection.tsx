import type { ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { File, FileText } from 'lucide-react';
import { CategoryCard } from './CategoryCard';

export function ResourcesSection(): ReactElement {
	const { t } = useTranslation();
	const navigate = useNavigate();

	return (
		<section className="space-y-3">
			<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
				{t('appLayout.resources', 'Resources')}
			</p>
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
				<CategoryCard
					icon={File}
					labelKey="appLayout.files"
					descriptionKey="home.filesDescription"
					accent="bg-foreground/8 text-foreground"
					onClick={() => navigate('/resources/images')}
				/>
				<CategoryCard
					icon={FileText}
					labelKey="appLayout.content"
					descriptionKey="home.contentDescription"
					accent="bg-muted text-foreground"
					onClick={() => navigate('/resources/content')}
				/>
			</div>
		</section>
	);
}
