import { ReactNode, forwardRef } from 'react';

export interface SvgIconProps {
    children: ReactNode;
    color?: string;
    inheritColor?: boolean;
    className?: string;
    size?: string | number;
    intent?: 'primary' | 'secondary' | 'destructive';
    variant?: 'filled' | 'outline' | 'tonal';
    disabled?: boolean;
    viewBox?: string;
    [key: string]: any; // per le altre proprietà SVG
}

export const calculateIconColor = ({
    color,
    inheritColor,
    intent = 'primary',
    variant = 'filled',
    disabled = false,
}: Omit<SvgIconProps, 'children'>): string => {
    let fillColor = "#001450"; // Colore di default

    // Struttura if-else-if per dare la giusta priorità
    if (disabled) {
        // Gestione colori per icone in pulsanti disabilitati
        fillColor = "var(--color-grey-60, #A3A3A3)";
    } else if (color) {
        // Se è fornito un colore esplicito, usalo
        console.log("Utilizzo colore esplicito:", color);
        fillColor = color;
    } else if (inheritColor) {
        fillColor = "currentColor";
    } else if (intent && variant) {
        // Logica di colore basata sulla combinazione intent+variant
        if (variant === 'filled') {
            switch (intent) {
                case 'primary':
                    fillColor = "var(--color-primary-foreground, white)";
                    break;
                case 'secondary':
                    fillColor = "var(--color-secondary-foreground, white)";
                    break;
                case 'destructive':
                    fillColor = "var(--color-destructive-foreground, white)";
                    break;
            }
        } else if (variant === 'outline' || variant === 'tonal') {
            switch (intent) {
                case 'primary':
                    fillColor = "var(--color-primary, #001450)";
                    break;
                case 'secondary':
                    fillColor = "var(--color-secondary, #1A2835)";
                    break;
                case 'destructive':
                    fillColor = "var(--color-destructive, #CC334D)";
                    break;
            }
        }
    }

    return fillColor;
};

export const normalizeSize = (size: string | number = "24px"): string | number => {
    if (size === "small") {
        return "18px";
    } else if (typeof size === "number") {
        return `${size}px`; // Se è un numero, lo considero come pixel
    }

    return size;
};

const SvgIcon = forwardRef<SVGSVGElement, SvgIconProps>(({
    children,
    color,
    inheritColor = false,
    className = "",
    size = "24px",
    intent = "secondary",
    variant = "tonal",
    disabled = false,
    viewBox = "0 0 24 24",
    ...restProps
}, ref) => {
    const fillColor = calculateIconColor({
        color, inheritColor, intent, variant, disabled
    });

    const _size = normalizeSize(size);
    console.log("🚀 ~ fillColor:", fillColor)

    return (
        <svg
            fill={fillColor}
            className={className}
            xmlns="http://www.w3.org/2000/svg"
            width={_size}
            height={_size}
            viewBox={viewBox}
            ref={ref}
            {...restProps}
        >
            {children}
        </svg>
    );
});

// Aggiungiamo displayName per migliorare il debugging
SvgIcon.displayName = 'SvgIcon';

export default SvgIcon;