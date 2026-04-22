import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Database, RefreshCw } from 'lucide-react';
import { useAppSelector } from '@/store';
import type { RootState } from '@/store';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { SliceSection } from './redux/SliceSection';
import type { SliceName } from './redux/redux-constants';

interface ReduxStateDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function ReduxStateDialog({ open, onOpenChange }: ReduxStateDialogProps) {
	const { t } = useTranslation();
	const [live, setLive] = useState(false);
	const [tick, setTick] = useState(0);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	useEffect(() => {
		if (live) {
			intervalRef.current = setInterval(() => setTick((v) => v + 1), 1000);
		}
		return () => {
			if (intervalRef.current) clearInterval(intervalRef.current);
		};
	}, [live]);

	const workspace = useAppSelector((s: RootState) => s.workspace);

	void tick;

	const slices: { name: SliceName; data: unknown }[] = [{ name: 'workspace', data: workspace }];

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex h-[calc(100vh-6rem)] min-w-[calc(100vw-8rem)] flex-col p-0 gap-0">
				<DialogHeader className="px-6 py-3 border-b shrink-0">
					<DialogTitle className="flex items-center gap-2 text-lg font-semibold">
						<Database className="h-5 w-5 text-muted-foreground" />
						{t('appLayout.redux', 'Redux')}
					</DialogTitle>
				</DialogHeader>
				<div className="flex-1 overflow-auto p-6 space-y-3">
					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={() => setTick((v) => v + 1)}
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
			</DialogContent>
		</Dialog>
	);
}
