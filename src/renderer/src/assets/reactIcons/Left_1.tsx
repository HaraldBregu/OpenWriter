
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type Left_1Props = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const Left_1 = React.forwardRef<SVGSVGElement, Left_1Props>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="m14 17.655-5.654-5.654 5.653-5.653L15.054 7.4l-4.6 4.6 4.6 4.6z" />
                    </SvgIcon>
                );
                });

                Left_1.displayName = 'Left_1';

                export default Left_1;
            