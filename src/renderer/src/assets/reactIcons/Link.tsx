
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type LinkProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const Link = React.forwardRef<SVGSVGElement, LinkProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M10.808 16.538h-3.77q-1.882 0-3.21-1.328Q2.5 13.883 2.5 12t1.328-3.211 3.21-1.328h3.77v1.5h-3.77q-1.26 0-2.149.89A2.93 2.93 0 0 0 4 11.998q0 1.26.89 2.15.889.889 2.149.889h3.769zM8.25 12.749v-1.5h7.5v1.5zm4.942 3.789v-1.5h3.77q1.26 0 2.148-.89.89-.89.89-2.149 0-1.26-.89-2.149a2.93 2.93 0 0 0-2.148-.89h-3.77v-1.5h3.77q1.883 0 3.21 1.328 1.328 1.327 1.328 3.21t-1.328 3.212-3.21 1.328z" />
                    </SvgIcon>
                );
                });

                Link.displayName = 'Link';

                export default Link;
            