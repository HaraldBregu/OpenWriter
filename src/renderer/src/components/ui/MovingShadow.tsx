import React from 'react';
import {
	motion,
	useAnimationFrame,
	useMotionTemplate,
	useMotionValue,
	useTransform,
} from 'motion/react';
import { cn } from '@/lib/utils';

export interface MovingShadowProps extends React.HTMLAttributes<HTMLElement> {
	borderRadius?: string;
	/** Orbit radius of the moving light source, in pixels. */
	shadowSize?: number;
	/** Blur radius of the cast shadow, in pixels. */
	shadowBlur?: number;
	/** Three CSS colors stacked into the cast shadow (default cyan/green/rose). */
	shadowColors?: [string, string, string];
	children: React.ReactNode;
	as?: React.ElementType;
	containerClassName?: string;
	duration?: number;
	className?: string;
}

const DEFAULT_COLORS: [string, string, string] = [
	'rgba(56, 189, 248, 0.65)',
	'rgba(52, 211, 153, 0.55)',
	'rgba(251, 113, 133, 0.65)',
];

const TWO_PI = Math.PI * 2;

export function MovingShadow({
	borderRadius = '1rem',
	shadowSize = 36,
	shadowBlur = 56,
	shadowColors = DEFAULT_COLORS,
	duration = 6000,
	children,
	as: Component = 'div',
	containerClassName,
	className,
	...otherProps
}: MovingShadowProps): React.ReactElement {
	const time = useMotionValue(0);

	useAnimationFrame((t) => {
		time.set(t);
	});

	const angle = useTransform(time, (t) => ((t % duration) / duration) * TWO_PI);

	const x = useTransform(angle, (a) => Math.cos(a) * shadowSize);
	const y = useTransform(angle, (a) => Math.sin(a) * shadowSize);

	const [c1, c2, c3] = shadowColors;
	const boxShadow = useMotionTemplate`${x}px ${y}px ${shadowBlur}px 0 ${c1}, ${x}px ${y}px ${shadowBlur * 1.6}px 4px ${c2}, ${x}px ${y}px ${shadowBlur * 2.2}px 10px ${c3}`;

	return (
		<Component className={cn('relative', containerClassName)} {...otherProps}>
			<motion.div
				className={cn('relative', className)}
				style={{ borderRadius, boxShadow }}
			>
				{children}
			</motion.div>
		</Component>
	);
}
