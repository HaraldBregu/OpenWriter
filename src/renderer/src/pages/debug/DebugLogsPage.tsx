import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollText, RefreshCw, Trash2, FolderOpen } from 'lucide-react';
import type { AppLogEntry } from '../../../../../preload/index.d';
import {
	AppButton,
	AppTooltip,
	AppTooltipTrigger,
	AppTooltipContent,
	AppTooltipProvider,
} from '../../../components/app';

type LogLevel = AppLogEntry['level'];

const LEVEL_STYLES: Record<LogLevel, string> = {
	DEBUG: 'text-muted-foreground bg-muted/50',
	INFO: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/40',
	WARN: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/40',
	ERROR: 'text-destructive bg-destructive/10',
};

const LEVEL_OPTIONS: Array<{ value: LogLevel | 'ALL'; label: string }> = [
	{ value: 'ALL', label: 'All' },
	{ value: 'DEBUG', label: 'Debug' },
	{ value: 'INFO', label: 'Info' },
	{ value: 'WARN', label: 'Warn' },
	{ value: 'ERROR', label: 'Error' },
];

const FETCH_LIMIT = 500;
const AUTO_REFRESH_MS = 3000;

export default function DebugLogsPage(): React.JSX.Element {
	const { t } = useTranslation();
	const [entries, setEntries] = useState<AppLogEntry[]>([]);
	const [filterLevel, setFilterLevel] = useState<LogLevel | 'ALL'>('ALL');
	const [search, setSearch] = useState('');
	const [autoRefresh, setAutoRefresh] = useState(false);
	const [loading, setLoading] = useState(false);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const fetchLogs = useCallback(async () => {
		setLoading(true);
		try {
			const result = await window.app.getLogs(FETCH_LIMIT);
			setEntries(result);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchLogs();
	}, [fetchLogs]);

	useEffect(() => {
		if (autoRefresh) {
			intervalRef.current = setInterval(fetchLogs, AUTO_REFRESH_MS);
		} else if (intervalRef.current) {
			clearInterval(intervalRef.current);
			intervalRef.current = null;
		}
		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
			}
		};
	}, [autoRefresh, fetchLogs]);

	const filtered = entries.filter((e) => {
		if (filterLevel !== 'ALL' && e.level !== filterLevel) return false;
		if (search) {
			const q = search.toLowerCase();
			return (
				e.source.toLowerCase().includes(q) ||
				e.message.toLowerCase().includes(q) ||
				e.level.toLowerCase().includes(q)
			);
		}
		return true;
	});

	return (
		<div className="flex flex-col h-full">
			{/* Header */}
			<div className="px-6 py-3 border-b shrink-0">
				<div className="flex items-center gap-2">
					<ScrollText className="h-5 w-5 text-muted-foreground" />
					<h1 className="text-lg font-semibold">{t('debug.logs', 'Logs')}</h1>
				</div>
			</div>

			{/* Toolbar */}
			<div className="flex items-center gap-2 px-4 py-2 border-b shrink-0 bg-background">
				<input
					type="text"
					placeholder={t('debug.logsSearch', 'Search logs…')}
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="flex-1 min-w-0 h-8 rounded-md border border-input bg-transparent px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
				/>

				<select
					value={filterLevel}
					onChange={(e) => setFilterLevel(e.target.value as LogLevel | 'ALL')}
					className="h-8 rounded-md border border-input bg-transparent px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
				>
					{LEVEL_OPTIONS.map((opt) => (
						<option key={opt.value} value={opt.value}>
							{opt.label}
						</option>
					))}
				</select>

				<button
					type="button"
					onClick={() => setAutoRefresh((v) => !v)}
					className={`flex items-center gap-1.5 h-8 rounded-md border px-3 text-sm transition-colors ${
						autoRefresh
							? 'border-primary bg-primary text-primary-foreground'
							: 'border-input hover:bg-accent hover:text-accent-foreground'
					}`}
					aria-pressed={autoRefresh}
					title={t('debug.autoRefresh', 'Auto-refresh')}
				>
					<RefreshCw className={`h-3.5 w-3.5 ${autoRefresh ? 'animate-spin' : ''}`} />
					<span>{t('debug.autoRefresh', 'Auto-refresh')}</span>
				</button>

				<button
					type="button"
					onClick={fetchLogs}
					disabled={loading}
					className="flex items-center gap-1.5 h-8 rounded-md border border-input px-3 text-sm hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
					title={t('debug.refresh', 'Refresh')}
				>
					<RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
				</button>

				<button
					type="button"
					onClick={() => setEntries([])}
					className="flex items-center gap-1.5 h-8 rounded-md border border-input px-3 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
					title={t('debug.clearLogs', 'Clear')}
				>
					<Trash2 className="h-3.5 w-3.5" />
				</button>
			</div>

			{/* Stats bar */}
			<div className="flex items-center gap-4 px-4 py-1.5 border-b shrink-0 text-xs text-muted-foreground bg-muted/30">
				<span>
					<span className="font-medium text-foreground">{filtered.length}</span>{' '}
					{t('debug.logsShown', 'shown')}
				</span>
				{entries.length !== filtered.length && (
					<span>
						{t('debug.logsOf', 'of')}{' '}
						<span className="font-medium text-foreground">{entries.length}</span>{' '}
						{t('debug.total', 'total')}
					</span>
				)}
			</div>

			{/* Table */}
			<div className="flex-1 overflow-auto font-mono text-xs">
				{filtered.length === 0 ? (
					<div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
						<ScrollText className="h-10 w-10 opacity-20" />
						<p className="text-sm font-sans">{t('debug.noLogsYet', 'No log entries yet')}</p>
					</div>
				) : (
					<table className="w-full text-left border-collapse">
						<thead className="sticky top-0 bg-background border-b z-10">
							<tr>
								<th className="px-4 py-2 font-sans text-xs font-medium text-muted-foreground uppercase tracking-wider w-[180px]">
									{t('debug.logsTimestamp', 'Timestamp')}
								</th>
								<th className="px-4 py-2 font-sans text-xs font-medium text-muted-foreground uppercase tracking-wider w-[64px]">
									{t('debug.logsLevel', 'Level')}
								</th>
								<th className="px-4 py-2 font-sans text-xs font-medium text-muted-foreground uppercase tracking-wider w-[160px]">
									{t('debug.logsSource', 'Source')}
								</th>
								<th className="px-4 py-2 font-sans text-xs font-medium text-muted-foreground uppercase tracking-wider">
									{t('debug.logsMessage', 'Message')}
								</th>
							</tr>
						</thead>
						<tbody>
							{filtered.map((entry, idx) => (
								<tr
									key={idx}
									className="border-b border-border/50 hover:bg-muted/30 transition-colors"
								>
									<td className="px-4 py-1.5 text-muted-foreground whitespace-nowrap">
										{entry.timestamp}
									</td>
									<td className="px-4 py-1.5 whitespace-nowrap">
										<span
											className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${LEVEL_STYLES[entry.level]}`}
										>
											{entry.level}
										</span>
									</td>
									<td className="px-4 py-1.5 text-muted-foreground whitespace-nowrap truncate max-w-[160px]">
										{entry.source}
									</td>
									<td className="px-4 py-1.5 break-all">{entry.message}</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</div>
		</div>
	);
}
