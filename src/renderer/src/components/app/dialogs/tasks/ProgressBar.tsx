export function ProgressBar({ percent }: { percent: number }) {
	return (
		<div className="w-20 bg-muted rounded-full h-1.5">
			<div
				className="bg-primary h-1.5 rounded-full transition-all"
				style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
			/>
		</div>
	);
}
