import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, RefreshCw, Trash2 } from 'lucide-react';
import type { CronJobInfo, CronTickEvent } from '../../../../../shared/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';

const MAX_TICKS = 200;

interface CronDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function CronDialog({ open, onOpenChange }: CronDialogProps) {
	const { t } = useTranslation();
	const [jobs, setJobs] = useState<CronJobInfo[]>([]);
	const [ticks, setTicks] = useState<CronTickEvent[]>([]);
	const [loading, setLoading] = useState(false);
	const unsubRef = useRef<(() => void) | null>(null);

	const fetchJobs = useCallback(async () => {
		setLoading(true);
		try {
			const result = await window.app.cronListJobs();
			setJobs(result);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		if (!open) return;
		fetchJobs();
		unsubRef.current = window.app.onCronTick((event) => {
			setTicks((prev) => [event, ...prev].slice(0, MAX_TICKS));
		});
		return () => {
			unsubRef.current?.();
			unsubRef.current = null;
		};
	}, [open, fetchJobs]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex h-[calc(100vh-6rem)] min-w-[calc(100vw-8rem)] flex-col p-0 gap-0">
				<DialogHeader className="px-6 py-3 border-b shrink-0">
					<DialogTitle className="flex items-center gap-2 text-lg font-semibold">
						<Clock className="h-5 w-5 text-muted-foreground" />
						{t('debug.cron', 'Cron')}
					</DialogTitle>
				</DialogHeader>

				<div className="flex items-center gap-2 px-4 py-2 border-b shrink-0 bg-background">
					<span className="text-xs text-muted-foreground">
						<span className="font-medium text-foreground">{jobs.length}</span>{' '}
						{t('debug.cronJobs', 'jobs')}
					</span>
					<span className="text-xs text-muted-foreground">
						<span className="font-medium text-foreground">{ticks.length}</span>{' '}
						{t('debug.cronTicks', 'ticks')}
					</span>
					<div className="ml-auto" />
					<Button
						variant="ghost"
						size="icon-xs"
						onClick={fetchJobs}
						disabled={loading}
						aria-label={t('debug.refresh', 'Refresh')}
					>
						<RefreshCw className={loading ? 'animate-spin' : ''} />
					</Button>
				</div>

				<div className="flex flex-1 min-h-0">
					<div className="flex-1 min-w-0 overflow-auto border-r font-mono text-xs">
						<table className="w-full text-left border-collapse">
							<thead className="sticky top-0 bg-background border-b z-10">
								<tr>
									<th className="px-4 py-2 font-sans text-xs font-medium text-muted-foreground uppercase tracking-wider">
										{t('debug.cronId', 'Job ID')}
									</th>
									<th className="px-4 py-2 font-sans text-xs font-medium text-muted-foreground uppercase tracking-wider">
										{t('debug.cronExpression', 'Expression')}
									</th>
								</tr>
							</thead>
							<tbody>
								{jobs.length === 0 ? (
									<tr>
										<td
											colSpan={2}
											className="px-4 py-8 text-center text-muted-foreground font-sans"
										>
											{t('debug.cronNoJobs', 'No scheduled jobs')}
										</td>
									</tr>
								) : (
									jobs.map((job) => (
										<tr
											key={job.id}
											className="border-b border-border/50 hover:bg-muted/30 transition-colors"
										>
											<td className="px-4 py-1.5 break-all">{job.id}</td>
											<td className="px-4 py-1.5 text-muted-foreground break-all">
												{job.expression}
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>

					<div className="flex-1 min-w-0 overflow-auto font-mono text-xs">
						<table className="w-full text-left border-collapse">
							<thead className="sticky top-0 bg-background border-b z-10">
								<tr>
									<th className="px-4 py-2 font-sans text-xs font-medium text-muted-foreground uppercase tracking-wider w-[200px]">
										{t('debug.cronFiredAt', 'Fired At')}
									</th>
									<th className="px-4 py-2 font-sans text-xs font-medium text-muted-foreground uppercase tracking-wider">
										{t('debug.cronId', 'Job ID')}
									</th>
								</tr>
							</thead>
							<tbody>
								{ticks.length === 0 ? (
									<tr>
										<td
											colSpan={2}
											className="px-4 py-8 text-center text-muted-foreground font-sans"
										>
											{t('debug.cronNoTicks', 'No ticks observed yet')}
										</td>
									</tr>
								) : (
									ticks.map((tick, idx) => (
										<tr
											key={idx}
											className="border-b border-border/50 hover:bg-muted/30 transition-colors"
										>
											<td className="px-4 py-1.5 text-muted-foreground whitespace-nowrap">
												{tick.firedAt}
											</td>
											<td className="px-4 py-1.5 break-all">{tick.id}</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
