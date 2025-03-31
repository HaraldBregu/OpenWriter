
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type FormatLineSpacingProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const FormatLineSpacing = React.forwardRef<SVGSVGElement, FormatLineSpacingProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M6.154 19.5 2.5 15.846l1.054-1.054 1.85 1.82V7.388l-1.85 1.819L2.5 8.154 6.154 4.5l3.654 3.654-1.054 1.054-1.85-1.82v9.223l1.85-1.819 1.054 1.054zm6.038-1V17H21.5v1.615zm0-5.75v-1.5H21.5v1.5zm0-5.75V5.5l9.308-.115V7z" />
                    </SvgIcon>
                );
                });

                FormatLineSpacing.displayName = 'FormatLineSpacing';

                export default FormatLineSpacing;
            