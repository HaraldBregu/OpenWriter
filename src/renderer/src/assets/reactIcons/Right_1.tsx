
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type Right_1Props = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const Right_1 = React.forwardRef<SVGSVGElement, Right_1Props>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="m12.946 12.001-4.6-4.6 1.053-1.053L15.053 12 9.4 17.655l-1.053-1.054z" />
                    </SvgIcon>
                );
                });

                Right_1.displayName = 'Right_1';

                export default Right_1;
            