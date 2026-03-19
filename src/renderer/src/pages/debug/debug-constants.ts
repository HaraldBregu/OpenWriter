import React from 'react';
import { Zap, Clock, Radio, AlertTriangle } from 'lucide-react';
import type { TaskStatus } from '@/store/tasks/types';

export type DemoVariant = 'fast' | 'slow' | 'streaming' | 'error';

export const DEMO_VARIANTS: {
	variant: DemoVariant;
	label: string;
	icon: React.ElementType;
	description: string;
}[] = [
	{ variant: 'fast', label: 'Fast', icon: Zap, description: '4 steps, ~1.2 s' },
	{ variant: 'slow', label: 'Slow', icon: Clock, description: '10 steps, ~8 s' },
	{ variant: 'streaming', label: 'Stream', icon: Radio, description: 'Token stream, ~3 s' },
	{ variant: 'error', label: 'Error', icon: AlertTriangle, description: 'Fails at 60 %' },
];

export const STATUS_CONFIG: Record<TaskStatus, { label: string; className: string }> = {
	queued: {
		label: 'Queued',
		className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
	},
	started: {
		label: 'Queued',
		className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
	},
	running: {
		label: 'Running',
		className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
	},
	completed: {
		label: 'Completed',
		className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
	},
	error: {
		label: 'Error',
		className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
	},
	cancelled: {
		label: 'Cancelled',
		className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
	},
};

export const SLICE_NAMES = ['workspace', 'tasks', 'documents', 'chats'] as const;
export type SliceName = (typeof SLICE_NAMES)[number];
