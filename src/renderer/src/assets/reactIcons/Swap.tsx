
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type SwapProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const Swap = React.forwardRef<SVGSVGElement, SwapProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M8.404 12.654V5.373L5.569 8.208 4.5 7.154 9.154 2.5l4.654 4.654-1.07 1.054-2.834-2.835v7.28zm6.432 8.846-4.653-4.654 1.069-1.054 2.834 2.835v-7.28h1.5v7.28l2.835-2.835 1.07 1.054z" />
                    </SvgIcon>
                );
                });

                Swap.displayName = 'Swap';

                export default Swap;
            