
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type Art_lineProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const Art_line = React.forwardRef<SVGSVGElement, Art_lineProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <g><path d="M7.308 15.5q-.758 0-1.283-.525a1.75 1.75 0 0 1-.525-1.283V4.308q0-.758.525-1.283T7.307 2.5h9.385q.758 0 1.283.525t.525 1.283v9.384q0 .758-.525 1.283t-1.283.525zm0-1.5h9.384a.3.3 0 0 0 .212-.096.3.3 0 0 0 .096-.212V4.308a.3.3 0 0 0-.096-.212.3.3 0 0 0-.212-.096H7.308a.3.3 0 0 0-.212.096.3.3 0 0 0-.096.212v9.384q0 .116.096.212a.3.3 0 0 0 .212.096m.923-2.116h7.538l-2.37-3.192-1.9 2.5-1.4-1.85zM5.5 21.615h13v-1.5h-13zM5.5 18.5h13V17h-13z" /></g>
                    </SvgIcon>
                );
                });

                Art_line.displayName = 'Art_line';

                export default Art_line;
            