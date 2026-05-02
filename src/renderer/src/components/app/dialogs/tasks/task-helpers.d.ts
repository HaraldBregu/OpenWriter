import type { DemoVariant } from './task-constants';
export declare function formatDuration(ms?: number): string;
export declare function formatEventTime(receivedAt: number): string;
export declare function submitDemoTask(variant: DemoVariant): Promise<void>;
