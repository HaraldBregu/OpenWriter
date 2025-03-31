
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type AlignJustifyProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const AlignJustify = React.forwardRef<SVGSVGElement, AlignJustifyProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M3.5 20.379v-1.5h17v1.5zm0-3.875v-1.5h17v1.5zm0-3.875v-1.5h17v1.5zm0-3.875v-1.5h17v1.5zm0-3.875v-1.5h17v1.5z" />
                    </SvgIcon>
                );
                });

                AlignJustify.displayName = 'AlignJustify';

                export default AlignJustify;
            