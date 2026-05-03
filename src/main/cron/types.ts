import type { ScheduledTask } from 'node-cron';

export interface CronJobOptions {
	timezone?: string;
	runOnStart?: boolean;
}

export interface RegisteredJob {
	id: string;
	expression: string;
	task: ScheduledTask;
}
