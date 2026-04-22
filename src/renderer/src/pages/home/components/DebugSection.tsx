import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { ListTodo, Database, ScrollText } from 'lucide-react';
import { useDebugDialogs } from '@/contexts/DebugDialogsContext';
import { CategoryCard } from './CategoryCard';

export function DebugSection(): ReactElement {
	const { t } = useTranslation();
	const { openTasksDialog, openReduxDialog, openLogDialog } = useDebugDialogs();

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
					onClick={openTasksDialog}
				/>
				<CategoryCard
					icon={Database}
					labelKey="appLayout.redux"
					descriptionKey="home.reduxDescription"
					accent="bg-muted text-foreground"
					onClick={openReduxDialog}
				/>
				<CategoryCard
					icon={ScrollText}
					labelKey="home.logs"
					descriptionKey="home.logsDescription"
					accent="bg-secondary text-foreground"
					onClick={openLogDialog}
				/>
			</div>
		</section>
	);
}
