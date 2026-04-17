import type { ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ListTodo, Database, ScrollText } from 'lucide-react';
import { CategoryCard } from './CategoryCard';

export function DebugSection(): ReactElement {
	const { t } = useTranslation();
	const navigate = useNavigate();

	return (
		<section className="space-y-3">
			<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
				{t('debug.title', 'Debug')}
			</p>
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
				<CategoryCard
					icon={ListTodo}
					labelKey="debug.tasks"
					descriptionKey="home.tasksDescription"
					accent="bg-foreground/8 text-foreground"
					onClick={() => navigate('/debug/tasks')}
				/>
				<CategoryCard
					icon={Database}
					labelKey="appLayout.redux"
					descriptionKey="home.reduxDescription"
					accent="bg-muted text-foreground"
					onClick={() => navigate('/debug/redux')}
				/>
				<CategoryCard
					icon={ScrollText}
					labelKey="home.logs"
					descriptionKey="home.logsDescription"
					accent="bg-secondary text-foreground"
					onClick={() => navigate('/debug/logs')}
				/>
			</div>
		</section>
	);
}
