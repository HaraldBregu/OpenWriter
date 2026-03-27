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
		className: 'border border-warning/20 bg-warning/12 text-warning',
	},
	started: {
		label: 'Queued',
		className: 'border border-warning/20 bg-warning/12 text-warning',
	},
	running: {
		label: 'Running',
		className: 'border border-info/20 bg-info/12 text-info',
	},
	completed: {
		label: 'Completed',
		className: 'border border-success/20 bg-success/12 text-success',
	},
	error: {
		label: 'Error',
		className: 'border border-destructive/20 bg-destructive/12 text-destructive',
	},
	cancelled: {
		label: 'Cancelled',
		className: 'border border-border bg-muted/70 text-muted-foreground',
	},
};

export const SLICE_NAMES = ['workspace', 'tasks', 'documents'] as const;
export type SliceName = (typeof SLICE_NAMES)[number];
