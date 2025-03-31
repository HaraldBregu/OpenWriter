
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type Art_wrapProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const Art_wrap = React.forwardRef<SVGSVGElement, Art_wrapProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <g><path d="M7.19 18.5q-.757 0-1.282-.525a1.75 1.75 0 0 1-.525-1.283V7.308q0-.758.525-1.283T7.19 5.5h9.385q.758 0 1.283.525t.525 1.283v9.384q0 .758-.525 1.283t-1.283.525zm0-1.5h9.385a.3.3 0 0 0 .212-.096.3.3 0 0 0 .096-.212V7.308a.3.3 0 0 0-.096-.212.3.3 0 0 0-.212-.096H7.19a.3.3 0 0 0-.211.096.3.3 0 0 0-.096.212v9.384q0 .116.096.212A.3.3 0 0 0 7.19 17m.924-2.116h7.538l-2.37-3.192-1.9 2.5-1.4-1.85zm12 3.616v-13h1.5v13zM2.113 5.5v13h1.5v-13z" /></g>
                    </SvgIcon>
                );
                });

                Art_wrap.displayName = 'Art_wrap';

                export default Art_wrap;
            