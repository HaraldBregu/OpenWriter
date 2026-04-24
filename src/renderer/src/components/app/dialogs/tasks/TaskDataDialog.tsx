import { useTranslation } from 'react-i18next';
import type { TrackedTask } from './types';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from '@/components/ui/Dialog';
import { formatEventTime } from './task-helpers';

interface TaskDataDialogProps {
	task: TrackedTask | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function TaskDataDialog({ task, open, onOpenChange }: TaskDataDialogProps) {
	const { t } = useTranslation();

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>{task?.type || t('debug.unknown')}</DialogTitle>
					<DialogDescription className="font-mono text-xs">
						{task ? task.taskId : ''}
					</DialogDescription>
				</DialogHeader>

				<div className="max-h-[60vh] overflow-y-auto space-y-1.5">
					{!task || task.events.length === 0 ? (
						<p className="text-xs text-muted-foreground text-center py-8">
							{t('debug.noEventsYet')}
						</p>
					) : (
						[...task.events].reverse().map((ev, i) => {
							const event = {
								state: ev.state,
								taskId: ev.data.taskId,
								data: ev.data.data,
								metadata: ev.data.metadata,
							};
							return (
								<div key={i} className="rounded border bg-background p-2 text-xs">
									<div className="flex items-center justify-between mb-1 gap-2">
										<span className="font-medium shrink-0">{ev.state}</span>
										<span className="text-muted-foreground shrink-0">
											{formatEventTime(ev.receivedAt)}
										</span>
									</div>
									<pre className="text-muted-foreground overflow-x-auto whitespace-pre-wrap break-all text-[10px] leading-relaxed">
										{JSON.stringify(event, null, 2)}
									</pre>
								</div>
							);
						})
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
