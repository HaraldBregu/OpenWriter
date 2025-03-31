
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type UpProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const Up = React.forwardRef<SVGSVGElement, UpProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M11.25 21.502V5.346l-4.88 4.863-1.044-1.044L12 2.492l6.673 6.673-1.044 1.07-4.879-4.88v16.147z" />
                    </SvgIcon>
                );
                });

                Up.displayName = 'Up';

                export default Up;
            