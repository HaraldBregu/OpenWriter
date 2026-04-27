import React, { useRef } from 'react';
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
	shadowSize?: string;
	children: React.ReactNode;
	as?: React.ElementType;
	containerClassName?: string;
	shadowClassName?: string;
	duration?: number;
	className?: string;
}

export function MovingShadow({
	borderRadius = '1rem',
	shadowSize = '32px',
	children,
	as: Component = 'div',
	containerClassName,
	shadowClassName,
	duration,
	className,
	...otherProps
}: MovingShadowProps): React.ReactElement {
	return (
		<Component
			className={cn('relative', containerClassName)}
			style={{ borderRadius }}
			{...otherProps}
		>
			<div
				aria-hidden="true"
				className="pointer-events-none absolute"
				style={{
					inset: `calc(${shadowSize} * -1)`,
					borderRadius: `calc(${borderRadius} + ${shadowSize})`,
				}}
			>
				<ShadowPath duration={duration} rx={borderRadius} ry={borderRadius}>
					<div
						className={cn(
							'h-32 w-32 rounded-full bg-[radial-gradient(circle,_#38bdf8_8%,_#34d399_32%,_#fb7185_56%,_transparent_72%)] opacity-70 blur-3xl',
							shadowClassName
						)}
					/>
				</ShadowPath>
			</div>
			<div className={cn('relative', className)} style={{ borderRadius }}>
				{children}
			</div>
		</Component>
	);
}

interface ShadowPathProps extends React.SVGProps<SVGSVGElement> {
	children: React.ReactNode;
	duration?: number;
	rx?: string;
	ry?: string;
}

const ShadowPath = ({
	children,
	duration = 3000,
	rx,
	ry,
	...otherProps
}: ShadowPathProps): React.ReactElement => {
	const pathRef = useRef<SVGRectElement | null>(null);
	const progress = useMotionValue<number>(0);

	useAnimationFrame((time) => {
		const length = pathRef.current?.getTotalLength();
		if (length) {
			const pxPerMillisecond = length / duration;
			progress.set((time * pxPerMillisecond) % length);
		}
	});

	const x = useTransform(progress, (val) => pathRef.current?.getPointAtLength(val).x ?? 0);
	const y = useTransform(progress, (val) => pathRef.current?.getPointAtLength(val).y ?? 0);

	const transform = useMotionTemplate`translateX(${x}px) translateY(${y}px) translateX(-50%) translateY(-50%)`;

	return (
		<>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				preserveAspectRatio="none"
				className="absolute h-full w-full"
				width="100%"
				height="100%"
				{...otherProps}
			>
				<rect fill="none" width="100%" height="100%" rx={rx} ry={ry} ref={pathRef} />
			</svg>
			<motion.div
				style={{
					position: 'absolute',
					top: 0,
					left: 0,
					display: 'inline-block',
					transform,
				}}
			>
				{children}
			</motion.div>
		</>
	);
};
