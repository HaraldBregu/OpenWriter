
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type Left_3Props = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const Left_3 = React.forwardRef<SVGSVGElement, Left_3Props>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M13.5 15.807 9.69 11.999 13.5 8.191z" />
                    </SvgIcon>
                );
                });

                Left_3.displayName = 'Left_3';

                export default Left_3;
            