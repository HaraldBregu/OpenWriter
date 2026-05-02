import * as React from 'react';
interface ImageProps extends React.ComponentProps<'img'> {
    caption?: string;
    description?: string;
    size?: 'default' | 'sm';
    cardClassName?: string;
}
declare function Image({ className, caption, description, size, cardClassName, alt, ...props }: ImageProps): import("react/jsx-runtime").JSX.Element;
export { Image };
export type { ImageProps };
