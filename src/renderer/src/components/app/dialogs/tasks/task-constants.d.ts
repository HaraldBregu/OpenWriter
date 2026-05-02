import React from 'react';
import type { TaskState } from '../../../../../../shared/types';
export type DemoVariant = 'fast' | 'slow' | 'streaming' | 'error';
export declare const DEMO_VARIANTS: {
    variant: DemoVariant;
    label: string;
    icon: React.ElementType;
    description: string;
}[];
export declare const STATUS_CONFIG: Record<TaskState, {
    label: string;
    className: string;
}>;
