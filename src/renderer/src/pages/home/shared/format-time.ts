const SECONDS_IN_MINUTE = 60;
const MINUTES_IN_HOUR = 60;
const HOURS_IN_DAY = 24;
const DAYS_IN_WEEK = 7;

export function formatRelativeTime(timestampMs: number): string {
	const seconds = Math.floor((Date.now() - timestampMs) / 1000);
	if (seconds < SECONDS_IN_MINUTE) return 'just now';
	const minutes = Math.floor(seconds / SECONDS_IN_MINUTE);
	if (minutes < MINUTES_IN_HOUR) return `${minutes}m ago`;
	const hours = Math.floor(minutes / MINUTES_IN_HOUR);
	if (hours < HOURS_IN_DAY) return `${hours}h ago`;
	const days = Math.floor(hours / HOURS_IN_DAY);
	if (days < DAYS_IN_WEEK) return `${days}d ago`;
	return `${Math.floor(days / DAYS_IN_WEEK)}w ago`;
}
