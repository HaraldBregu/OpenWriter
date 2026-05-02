import React from 'react';
export interface MovingShadowProps extends React.HTMLAttributes<HTMLElement> {
    borderRadius?: string;
    /** Orbit radius of the moving glow, in pixels. */
    shadowSize?: number;
    /** Blur amount applied to the glow blob, in pixels. */
    shadowBlur?: number;
    /** Three CSS colors blended into the glow (default cyan/green/rose). */
    shadowColors?: [string, string, string];
    /** Overall opacity of the cast glow. Default 0.18 (very subtle). */
    shadowOpacity?: number;
    children: React.ReactNode;
    as?: React.ElementType;
    containerClassName?: string;
    duration?: number;
    className?: string;
}
export declare function MovingShadow({ borderRadius, shadowSize, shadowBlur, shadowColors, shadowOpacity, duration, children, as: Component, containerClassName, className, ...otherProps }: MovingShadowProps): React.ReactElement;
