
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type Left_2Props = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const Left_2 = React.forwardRef<SVGSVGElement, Left_2Props>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M11.125 17.655 5.47 12.001l5.653-5.653L12.179 7.4l-4.584 4.6 4.584 4.6zm6.35 0-5.654-5.654 5.653-5.653L18.528 7.4l-4.584 4.6 4.584 4.6z" />
                    </SvgIcon>
                );
                });

                Left_2.displayName = 'Left_2';

                export default Left_2;
            