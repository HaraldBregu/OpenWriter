
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type ColorTextProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const ColorText = React.forwardRef<SVGSVGElement, ColorTextProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M2.5 23.879v-3.73h19v3.73zm3.366-7 5.269-13.5h1.73l5.27 13.5H16.33l-1.346-3.62H9.008L7.63 16.88zm3.669-5.1h4.892l-2.377-6.3h-.12z" />
                    </SvgIcon>
                );
                });

                ColorText.displayName = 'ColorText';

                export default ColorText;
            