
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type StarOutlineProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const StarOutline = React.forwardRef<SVGSVGElement, StarOutlineProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="m8.85 16.823 3.15-1.9 3.15 1.925-.825-3.6 2.774-2.4-3.65-.325-1.45-3.4-1.45 3.375-3.65.325 2.775 2.425zM6.573 19.96l1.433-6.17-4.786-4.147 6.315-.548L12 3.277l2.463 5.818 6.315.548-4.786 4.148 1.432 6.169L12 16.687z" />
                    </SvgIcon>
                );
                });

                StarOutline.displayName = 'StarOutline';

                export default StarOutline;
            