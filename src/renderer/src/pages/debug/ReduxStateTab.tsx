import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react';
import { useAppSelector } from '@/store';
import type { RootState } from '@/store';
import type { SliceName } from './debug-constants';
import { SliceSection } from './SliceSection';

export function ReduxStateTab() {
	const { t } = useTranslation();
	const [live, setLive] = useState(false);
	const [tick, setTick] = useState(0);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	useEffect(() => {
		if (live) {
			intervalRef.current = setInterval(() => setTick((t) => t + 1), 1000);
		}
		return () => {
			if (intervalRef.current) clearInterval(intervalRef.current);
		};
	}, [live]);

	const workspace = useAppSelector((s: RootState) => s.workspace);
	const tasks = useAppSelector((s: RootState) => s.tasks);
	const documents = useAppSelector((s: RootState) => s.documents);
	const chats = useAppSelector((s: RootState) => s.chats);

	void tick;

	const slices: { name: SliceName; data: unknown }[] = [
		{ name: 'workspace', data: workspace },
		{ name: 'tasks', data: tasks },
		{ name: 'documents', data: documents },
		{ name: 'chats', data: chats },
	];

	return (
		<div className="flex-1 overflow-auto p-6 space-y-3">
			<div className="flex items-center gap-3">
				<button
					type="button"
					onClick={() => setTick((t) => t + 1)}
					className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md border bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
				>
					<RefreshCw className="h-3 w-3" />
					{t('debug.refresh')}
				</button>
				<label className="inline-flex items-center gap-1.5 text-xs cursor-pointer select-none">
					<input
						type="checkbox"
						checked={live}
						onChange={(e) => setLive(e.target.checked)}
						className="rounded border-muted-foreground"
					/>
					{t('debug.live')}
				</label>
			</div>

			{slices.map(({ name, data }) => (
				<SliceSection key={name} name={name} data={data} />
			))}
		</div>
	);
}
