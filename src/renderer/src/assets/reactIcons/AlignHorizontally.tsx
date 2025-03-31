
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type AlignHorizontallyProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const AlignHorizontally = React.forwardRef<SVGSVGElement, AlignHorizontallyProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M5.308 10.809q-.758 0-1.283-.525A1.75 1.75 0 0 1 3.5 9V5.616q0-.757.525-1.282t1.283-.525h13.384q.758 0 1.283.525t.525 1.282v3.385q0 .758-.525 1.283t-1.283.525zm0-1.5h13.384a.3.3 0 0 0 .212-.097.3.3 0 0 0 .096-.211V5.616a.3.3 0 0 0-.096-.211.3.3 0 0 0-.212-.096H5.308a.3.3 0 0 0-.212.096.3.3 0 0 0-.096.211v3.385q0 .115.096.211a.3.3 0 0 0 .212.097m0 10.884q-.758 0-1.283-.525a1.75 1.75 0 0 1-.525-1.283v-3.384q0-.758.525-1.283t1.283-.525h13.384q.758 0 1.283.525t.525 1.283v3.384q0 .758-.525 1.283t-1.283.525zm0-1.5h13.384a.3.3 0 0 0 .212-.096.3.3 0 0 0 .096-.212v-3.384a.3.3 0 0 0-.096-.212.3.3 0 0 0-.212-.096H5.308a.3.3 0 0 0-.212.096.3.3 0 0 0-.096.212v3.384q0 .116.096.212a.3.3 0 0 0 .212.096" />
                    </SvgIcon>
                );
                });

                AlignHorizontally.displayName = 'AlignHorizontally';

                export default AlignHorizontally;
            