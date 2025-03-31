
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type Expand_1Props = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const Expand_1 = React.forwardRef<SVGSVGElement, Expand_1Props>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M14.25 16.75h4.5v-4.5h-1.5v3h-3zm-9-5h1.5v-3h3v-1.5h-4.5zm-.942 7.75q-.758 0-1.283-.525a1.75 1.75 0 0 1-.525-1.283V6.308q0-.758.525-1.283T4.308 4.5h15.384q.758 0 1.283.525t.525 1.283v11.384q0 .758-.525 1.283t-1.283.525zm0-1.5h15.384a.3.3 0 0 0 .212-.096.3.3 0 0 0 .096-.212V6.308a.3.3 0 0 0-.096-.212.3.3 0 0 0-.212-.096H4.308a.3.3 0 0 0-.212.096.3.3 0 0 0-.096.212v11.384q0 .116.096.212a.3.3 0 0 0 .212.096" />
                    </SvgIcon>
                );
                });

                Expand_1.displayName = 'Expand_1';

                export default Expand_1;
            