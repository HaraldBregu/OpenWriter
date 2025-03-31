
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type StarFullProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const StarFull = React.forwardRef<SVGSVGElement, StarFullProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="m6.574 19.96 1.433-6.17-4.786-4.147 6.315-.548L12 3.277l2.463 5.818 6.315.548-4.786 4.148 1.432 6.169L12 16.687z" />
                    </SvgIcon>
                );
                });

                StarFull.displayName = 'StarFull';

                export default StarFull;
            