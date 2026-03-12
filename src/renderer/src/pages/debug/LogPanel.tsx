import React from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import type { TrackedTaskState } from '@/store/tasks/types';
import { formatEventTime } from './debug-helpers';

interface LogPanelProps {
	task: TrackedTaskState;
	onClose: () => void;
}

export function LogPanel({ task, onClose }: LogPanelProps) {
	const { t } = useTranslation();
	return (
		<div className="flex flex-col border-l bg-muted/20 w-80 shrink-0 h-full">
			<div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
				<div className="min-w-0">
					<p className="text-sm font-medium truncate">{task.type || t('debug.unknown')}</p>
					<p className="text-xs text-muted-foreground font-mono">{task.taskId.slice(0, 12)}…</p>
				</div>
				<button
					type="button"
					onClick={onClose}
					className="ml-2 shrink-0 p-1 rounded hover:bg-accent transition-colors"
					title={t('debug.closeLogs')}
				>
					<X className="h-4 w-4" />
				</button>
			</div>

			<div className="flex-1 overflow-y-auto p-3 space-y-1.5">
				{task.events.length === 0 ? (
					<p className="text-xs text-muted-foreground text-center py-8">No events yet</p>
				) : (
					[...task.events].reverse().map((ev, i) => (
						<div key={i} className="rounded border bg-background p-2 text-xs">
							<div className="flex items-center justify-between mb-1 gap-2">
								<span className="font-medium shrink-0">{ev.type}</span>
								<span className="text-muted-foreground shrink-0">
									{formatEventTime(ev.receivedAt)}
								</span>
							</div>
							<pre className="text-muted-foreground overflow-x-auto whitespace-pre-wrap break-all text-[10px] leading-relaxed">
								{JSON.stringify(ev.data, null, 2)}
							</pre>
						</div>
					))
				)}
			</div>
		</div>
	);
}
