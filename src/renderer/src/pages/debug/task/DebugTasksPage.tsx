import React from 'react';
import { useTranslation } from 'react-i18next';
import { Bug } from 'lucide-react';
import { TasksTab } from './TasksTab';

export default function DebugTasksPage(): React.JSX.Element {
	const { t } = useTranslation();

	return (
		<div className="flex flex-col h-full">
			<div className="px-6 py-3 border-b shrink-0">
				<div className="flex items-center gap-2">
					<Bug className="h-5 w-5 text-muted-foreground" />
					<h1 className="text-lg font-semibold">{t('debug.tasks')}</h1>
				</div>
			</div>
			<div className="flex flex-1 min-h-0">
				<TasksTab />
			</div>
		</div>
	);
}
