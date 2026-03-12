import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Bug } from 'lucide-react';
import { useDebugTasks } from '../../hooks/use-debug-tasks';
import { DEMO_VARIANTS } from './debug-constants';
import { submitDemoTask } from './debug-helpers';
import { TaskRow } from './TaskRow';
import { LogPanel } from './LogPanel';

export function TasksTab() {
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
				<div className="px-6 py-3 border-b shrink-0 space-y-2">
					<div className="flex items-center gap-4 text-xs text-muted-foreground">
						<span>
							<span className="font-medium text-foreground">{queueStats.running}</span> running
						</span>
						<span>
							<span className="font-medium text-foreground">{queueStats.queued}</span> queued
						</span>
						<span>
							<span className="font-medium text-foreground">{queueStats.completed}</span> completed
						</span>
						{queueStats.error > 0 && (
							<span className="text-destructive">
								<span className="font-medium">{queueStats.error}</span> errors
							</span>
						)}
					</div>

					<div className="flex items-center gap-2 pb-1">
						<span className="text-xs text-muted-foreground shrink-0">Demo task:</span>
						{DEMO_VARIANTS.map(({ variant, label, icon: Icon, description }) => (
							<button
								key={variant}
								type="button"
								title={description}
								onClick={() => submitDemoTask(variant)}
								className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md border bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
							>
								<Icon className="h-3 w-3 shrink-0" />
								{label}
							</button>
						))}
					</div>
				</div>

				<div className="flex-1 overflow-auto">
					{tasks.length === 0 ? (
						<div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
							<Bug className="h-10 w-10 opacity-20" />
							<p className="text-sm">No tasks tracked yet</p>
							<p className="text-xs opacity-60">Tasks will appear here when submitted</p>
						</div>
					) : (
						<table className="w-full text-left">
							<thead className="border-b sticky top-0 bg-background z-10">
								<tr>
									<th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
										ID
									</th>
									<th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
										Type
									</th>
									<th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
										Status
									</th>
									<th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
										Priority
									</th>
									<th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
										Progress
									</th>
									<th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
										Duration
									</th>
									<th className="px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
										Actions
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
