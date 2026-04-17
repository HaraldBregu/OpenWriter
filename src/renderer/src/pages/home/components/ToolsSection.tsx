import type { ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Settings, Sparkles } from 'lucide-react';
import { CategoryCard } from './CategoryCard';

export function ToolsSection(): ReactElement {
	const { t } = useTranslation();
	const navigate = useNavigate();

	return (
		<section className="space-y-3">
			<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
				{t('home.tools', 'Tools')}
			</p>
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
				<CategoryCard
					icon={Search}
					labelKey="common.search"
					descriptionKey="home.searchDescription"
					accent="bg-foreground/8 text-foreground"
					onClick={() => navigate('/search')}
				/>
				<CategoryCard
					icon={Sparkles}
					labelKey="home.models"
					descriptionKey="home.modelsDescription"
					accent="bg-muted text-foreground"
					onClick={() => navigate('/settings/models')}
				/>
				<CategoryCard
					icon={Settings}
					labelKey="menu.settings"
					descriptionKey="home.settingsDescription"
					accent="bg-secondary text-foreground"
					onClick={() => navigate('/settings/general')}
				/>
			</div>
		</section>
	);
}
