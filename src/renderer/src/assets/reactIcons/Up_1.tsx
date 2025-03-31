
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type Up_1Props = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const Up_1 = React.forwardRef<SVGSVGElement, Up_1Props>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M8.191 13.5 12 9.69l3.808 3.808z" />
                    </SvgIcon>
                );
                });

                Up_1.displayName = 'Up_1';

                export default Up_1;
            