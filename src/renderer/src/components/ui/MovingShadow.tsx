import React from 'react';
import { motion, useAnimationFrame, useMotionValue, useTransform } from 'motion/react';
import { cn } from '@/lib/utils';

export interface MovingShadowProps extends React.HTMLAttributes<HTMLElement> {
	borderRadius?: string;
	/** Orbit radius of the moving glow, in pixels. */
	shadowSize?: number;
	/** Blur amount applied to the glow blob, in pixels. */
	shadowBlur?: number;
	/** Three CSS colors blended into the glow (default cyan/green/rose). */
	shadowColors?: [string, string, string];
	children: React.ReactNode;
	as?: React.ElementType;
	containerClassName?: string;
	duration?: number;
	className?: string;
}

const DEFAULT_COLORS: [string, string, string] = [
	'rgba(56, 189, 248, 0.85)',
	'rgba(52, 211, 153, 0.75)',
	'rgba(251, 113, 133, 0.85)',
];

const TWO_PI = Math.PI * 2;

export function MovingShadow({
	borderRadius = '1rem',
	shadowSize = 60,
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
	const glowBackground = `conic-gradient(from 0deg, ${c1}, ${c2}, ${c3}, ${c1})`;
	const insetSize = shadowBlur + shadowSize;
	const inset = -insetSize;
	const blobRadius = `calc(${borderRadius} + ${insetSize}px)`;

	return (
		<Component
			className={cn('relative isolate', containerClassName)}
			{...otherProps}
		>
			<motion.div
				aria-hidden="true"
				className="pointer-events-none absolute -z-10"
				style={{
					top: inset,
					right: inset,
					bottom: inset,
					left: inset,
					x,
					y,
					borderRadius: blobRadius,
					background: glowBackground,
					filter: `blur(${shadowBlur}px)`,
					opacity: 0.85,
				}}
			/>
			<div className={cn('relative', className)} style={{ borderRadius }}>
				{children}
			</div>
		</Component>
	);
}
