import cron from 'node-cron';
import type { Disposable } from '../core/service-container';
import type { LoggerService } from '../logger';
import type { CronJobOptions, RegisteredJob } from './types';

/**
 * Service responsible for scheduling and managing recurring jobs
 * via node-cron. Jobs are keyed by id and stopped on shutdown.
 */
export class CronService implements Disposable {
	private readonly logger: LoggerService;
	private readonly jobs = new Map<string, RegisteredJob>();

	constructor(logger: LoggerService) {
		this.logger = logger;
	}

	schedule(
		id: string,
		expression: string,
		handler: () => void | Promise<void>,
		options: CronJobOptions = {}
	): void {
		if (this.jobs.has(id)) {
			throw new Error(`Cron job "${id}" is already registered`);
		}

		if (!cron.validate(expression)) {
			throw new Error(`Invalid cron expression for "${id}": ${expression}`);
		}

		const task = cron.schedule(
			expression,
			async () => {
				try {
					await handler();
				} catch (err) {
					this.logger.error('CronService', `Job "${id}" failed`, err);
				}
			},
			{ timezone: options.timezone }
		);

		this.jobs.set(id, { id, expression, task });
		this.logger.info('CronService', `Scheduled job "${id}" with "${expression}"`);

		if (options.runOnStart) {
			void Promise.resolve(handler()).catch((err) => {
				this.logger.error('CronService', `Initial run of "${id}" failed`, err);
			});
		}
	}

	unschedule(id: string): void {
		const job = this.jobs.get(id);
		if (!job) return;
		job.task.stop();
		this.jobs.delete(id);
		this.logger.info('CronService', `Unscheduled job "${id}"`);
	}

	listJobs(): { id: string; expression: string }[] {
		return Array.from(this.jobs.values()).map(({ id, expression }) => ({ id, expression }));
	}

	has(id: string): boolean {
		return this.jobs.has(id);
	}

	destroy(): void {
		for (const job of this.jobs.values()) {
			try {
				job.task.stop();
			} catch (err) {
				this.logger.error('CronService', `Failed to stop job "${job.id}"`, err);
			}
		}
		this.jobs.clear();
		this.logger.info('CronService', 'Disposed');
	}
}
