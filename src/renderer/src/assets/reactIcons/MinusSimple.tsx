
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type MinusSimpleProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const MinusSimple = React.forwardRef<SVGSVGElement, MinusSimpleProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M5.5 12.75v-1.5h13v1.5z" />
                    </SvgIcon>
                );
                });

                MinusSimple.displayName = 'MinusSimple';

                export default MinusSimple;
            