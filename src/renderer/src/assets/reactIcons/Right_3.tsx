
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type Right_3Props = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const Right_3 = React.forwardRef<SVGSVGElement, Right_3Props>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M10.5 15.807V8.19L14.308 12z" />
                    </SvgIcon>
                );
                });

                Right_3.displayName = 'Right_3';

                export default Right_3;
            