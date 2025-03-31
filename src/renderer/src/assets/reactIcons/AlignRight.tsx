
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type AlignRightProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const AlignRight = React.forwardRef<SVGSVGElement, AlignRightProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M3.5 5V3.5h17V5zm6 3.875v-1.5h11v1.5zm-6 3.875v-1.5h17v1.5zm6 3.875v-1.5h11v1.5zm-6 3.875V19h17v1.5z" />
                    </SvgIcon>
                );
                });

                AlignRight.displayName = 'AlignRight';

                export default AlignRight;
            