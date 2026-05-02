import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { motion, useAnimationFrame, useMotionValue, useTransform } from 'motion/react';
import { cn } from '@/lib/utils';
const DEFAULT_COLORS = [
    'rgba(56, 189, 248, 0.55)',
    'rgba(52, 211, 153, 0.45)',
    'rgba(251, 113, 133, 0.55)',
];
const TWO_PI = Math.PI * 2;
export function MovingShadow({ borderRadius = '1rem', shadowSize = 60, shadowBlur = 56, shadowColors = DEFAULT_COLORS, shadowOpacity = 0.18, duration = 6000, children, as: Component = 'div', containerClassName, className, ...otherProps }) {
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
    return (_jsxs(Component, { className: cn('relative isolate', containerClassName), ...otherProps, children: [_jsx(motion.div, { "aria-hidden": "true", className: "pointer-events-none absolute -z-10", style: {
                    top: inset,
                    right: inset,
                    bottom: inset,
                    left: inset,
                    x,
                    y,
                    borderRadius: blobRadius,
                    background: glowBackground,
                    filter: `blur(${shadowBlur}px)`,
                    opacity: shadowOpacity,
                } }), _jsx("div", { className: cn('relative', className), style: { borderRadius }, children: children })] }));
}
