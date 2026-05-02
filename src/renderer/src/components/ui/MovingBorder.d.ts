import React from 'react';
export interface MovingBorderButtonProps extends React.HTMLAttributes<HTMLElement> {
    borderRadius?: string;
    children: React.ReactNode;
    as?: React.ElementType;
    containerClassName?: string;
    borderClassName?: string;
    duration?: number;
    className?: string;
}
export declare function Button({ borderRadius, children, as: Component, containerClassName, borderClassName, duration, className, ...otherProps }: MovingBorderButtonProps): React.ReactElement;
interface MovingBorderProps extends React.SVGProps<SVGSVGElement> {
    children: React.ReactNode;
    duration?: number;
    rx?: string;
    ry?: string;
}
export declare const MovingBorder: ({ children, duration, rx, ry, ...otherProps }: MovingBorderProps) => React.ReactElement;
export {};
