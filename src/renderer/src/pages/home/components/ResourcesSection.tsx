import type { ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { File, FileText, Database } from 'lucide-react';
import { CategoryCard } from './CategoryCard';

export function ResourcesSection(): ReactElement {
	const { t } = useTranslation();
	const navigate = useNavigate();

	return (
		<section className="space-y-3">
			<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
				{t('appLayout.resources', 'Resources')}
			</p>
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
				<CategoryCard
					icon={File}
					labelKey="appLayout.files"
					descriptionKey="home.filesDescription"
					accent="bg-foreground/8 text-foreground"
					onClick={() => navigate('/resources/files')}
				/>
				<CategoryCard
					icon={FileText}
					labelKey="appLayout.content"
					descriptionKey="home.contentDescription"
					accent="bg-muted text-foreground"
					onClick={() => navigate('/resources/content')}
				/>
				<CategoryCard
					icon={Database}
					labelKey="appLayout.data"
					descriptionKey="home.dataDescription"
					accent="bg-secondary text-foreground"
					onClick={() => navigate('/resources/data')}
				/>
			</div>
		</section>
	);
}
