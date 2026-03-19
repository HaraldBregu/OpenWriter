import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Bug } from 'lucide-react';
import { useDebugTasks } from '../../hooks/use-debug-tasks';
import { DEMO_VARIANTS } from './debug-constants';
import { submitDemoTask } from './debug-helpers';
import { TaskRow } from './TaskRow';
import { LogPanel } from './LogPanel';

export function TasksTab() {
	const { t } = useTranslation();
	const { tasks, queueStats, hide, cancel } = useDebugTasks();
	const [selectedId, setSelectedId] = useState<string | null>(null);

	const selectedTask = tasks.find((t) => t.taskId === selectedId) ?? null;

	const handleSelect = useCallback((taskId: string) => {
		setSelectedId((prev) => (prev === taskId ? null : taskId));
	}, []);

	const handleHide = useCallback(
		(taskId: string) => {
			if (selectedId === taskId) setSelectedId(null);
			hide(taskId);
		},
		[selectedId, hide]
	);

	return (
		<div className="flex flex-1 min-h-0">
			<div className="flex flex-col flex-1 min-w-0 min-h-0">
				<div className="px-6 py-3 border-b shrink-0">
					<div className="flex items-center gap-4 text-xs text-muted-foreground">
						<span>
							<span className="font-medium text-foreground">{queueStats.running}</span>{' '}
							{t('debug.running')}
						</span>
						<span>
							<span className="font-medium text-foreground">{queueStats.queued}</span>{' '}
							{t('debug.queued')}
						</span>
						<span>
							<span className="font-medium text-foreground">{queueStats.completed}</span>{' '}
							{t('debug.completed')}
						</span>
						{queueStats.error > 0 && (
							<span className="text-destructive">
								<span className="font-medium">{queueStats.error}</span> {t('debug.errors')}
							</span>
						)}
					</div>
				</div>

				<div className="flex-1 overflow-auto">
					{tasks.length === 0 ? (
						<div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
							<Bug className="h-10 w-10 opacity-20" />
							<p className="text-sm">{t('debug.noTasksYet')}</p>
							<p className="text-xs opacity-60">{t('debug.tasksWillAppear')}</p>
						</div>
					) : (
						<table className="w-full text-left">
							<thead className="border-b sticky top-0 bg-background z-10">
								<tr>
									<th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
										{t('debug.id')}
									</th>
									<th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
										{t('debug.type')}
									</th>
									<th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
										{t('debug.status')}
									</th>
									<th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
										{t('debug.priority')}
									</th>
									<th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
										{t('debug.progress')}
									</th>
									<th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
										{t('debug.duration')}
									</th>
									<th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
										{t('debug.actions')}
									</th>
								</tr>
							</thead>
							<tbody>
								{tasks.map((task) => (
									<TaskRow
										key={task.taskId}
										task={task}
										isSelected={selectedId === task.taskId}
										onSelect={() => handleSelect(task.taskId)}
										onCancel={() => cancel(task.taskId)}
										onHide={() => handleHide(task.taskId)}
									/>
								))}
							</tbody>
						</table>
					)}
				</div>
			</div>

			{selectedTask && <LogPanel task={selectedTask} onClose={() => setSelectedId(null)} />}
		</div>
	);
}
