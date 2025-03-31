
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type AlignCenterProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const AlignCenter = React.forwardRef<SVGSVGElement, AlignCenterProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M3.5 20.5V19h17v1.5zm4-3.875v-1.5h9v1.5zm-4-3.875v-1.5h17v1.5zm4-3.875v-1.5h9v1.5zM3.5 5V3.5h17V5z" />
                    </SvgIcon>
                );
                });

                AlignCenter.displayName = 'AlignCenter';

                export default AlignCenter;
            