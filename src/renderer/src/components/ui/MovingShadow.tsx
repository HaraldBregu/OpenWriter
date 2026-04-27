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
	/** Orbit radius of the moving light sources, in pixels. */
	shadowSize?: number;
	/** Blur radius of each cast shadow, in pixels. */
	shadowBlur?: number;
	/** Three CSS colors for the orbiting shadows (default cyan/green/rose). */
	shadowColors?: [string, string, string];
	children: React.ReactNode;
	as?: React.ElementType;
	containerClassName?: string;
	duration?: number;
	className?: string;
}

const DEFAULT_COLORS: [string, string, string] = [
	'rgba(56, 189, 248, 0.55)',
	'rgba(52, 211, 153, 0.45)',
	'rgba(251, 113, 133, 0.50)',
];

const TWO_PI = Math.PI * 2;
const PHASE_120 = TWO_PI / 3;
const PHASE_240 = (TWO_PI * 2) / 3;

export function MovingShadow({
	borderRadius = '1rem',
	shadowSize = 28,
	shadowBlur = 36,
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

	const x1 = useTransform(angle, (a) => Math.cos(a) * shadowSize);
	const y1 = useTransform(angle, (a) => Math.sin(a) * shadowSize);
	const x2 = useTransform(angle, (a) => Math.cos(a + PHASE_120) * shadowSize);
	const y2 = useTransform(angle, (a) => Math.sin(a + PHASE_120) * shadowSize);
	const x3 = useTransform(angle, (a) => Math.cos(a + PHASE_240) * shadowSize);
	const y3 = useTransform(angle, (a) => Math.sin(a + PHASE_240) * shadowSize);

	const [c1, c2, c3] = shadowColors;
	const boxShadow = useMotionTemplate`${x1}px ${y1}px ${shadowBlur}px 0 ${c1}, ${x2}px ${y2}px ${shadowBlur}px 0 ${c2}, ${x3}px ${y3}px ${shadowBlur}px 0 ${c3}`;

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
