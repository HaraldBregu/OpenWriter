
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type PlusSquareProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const PlusSquare = React.forwardRef<SVGSVGElement, PlusSquareProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M11.25 12.75V16q0 .32.216.535a.73.73 0 0 0 .534.215.73.73 0 0 0 .534-.215.73.73 0 0 0 .216-.535v-3.25H16a.73.73 0 0 0 .535-.216.73.73 0 0 0 .215-.534.73.73 0 0 0-.215-.534.73.73 0 0 0-.535-.216h-3.25V8a.73.73 0 0 0-.216-.535A.73.73 0 0 0 12 7.25a.73.73 0 0 0-.534.215.73.73 0 0 0-.216.535v3.25H8a.73.73 0 0 0-.535.216.73.73 0 0 0-.215.534q0 .32.215.534A.73.73 0 0 0 8 12.75zM5.308 20.5q-.758 0-1.283-.525a1.75 1.75 0 0 1-.525-1.283V5.308q0-.758.525-1.283T5.308 3.5h13.384q.758 0 1.283.525t.525 1.283v13.384q0 .758-.525 1.283t-1.283.525zm0-1.5h13.384a.3.3 0 0 0 .212-.096.3.3 0 0 0 .096-.212V5.308a.3.3 0 0 0-.096-.212.3.3 0 0 0-.212-.096H5.308a.3.3 0 0 0-.212.096.3.3 0 0 0-.096.212v13.384q0 .116.096.212a.3.3 0 0 0 .212.096" />
                    </SvgIcon>
                );
                });

                PlusSquare.displayName = 'PlusSquare';

                export default PlusSquare;
            