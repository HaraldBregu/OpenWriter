
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type AlignVerticallyProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const AlignVertically = React.forwardRef<SVGSVGElement, AlignVerticallyProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M15 20.5q-.756 0-1.282-.525a1.75 1.75 0 0 1-.525-1.283V5.308q0-.758.525-1.283t1.283-.525h3.384q.758 0 1.283.525t.525 1.283v13.384q0 .758-.525 1.283-.524.525-1.283.525zm-.307-15.192v13.384q0 .116.096.212a.3.3 0 0 0 .212.096h3.384a.3.3 0 0 0 .212-.096.3.3 0 0 0 .096-.212V5.308a.3.3 0 0 0-.096-.212.3.3 0 0 0-.212-.096h-3.384a.3.3 0 0 0-.212.096.3.3 0 0 0-.096.212M5.616 20.5q-.757 0-1.282-.525a1.75 1.75 0 0 1-.525-1.283V5.308q0-.758.525-1.283T5.616 3.5h3.385q.758 0 1.283.525t.525 1.283v13.384q0 .758-.525 1.283T9 20.5zM5.31 5.308v13.384q0 .116.096.212a.3.3 0 0 0 .211.096h3.385a.3.3 0 0 0 .211-.096.3.3 0 0 0 .097-.212V5.308a.3.3 0 0 0-.097-.212A.3.3 0 0 0 9.001 5H5.616a.3.3 0 0 0-.211.096.3.3 0 0 0-.096.212" />
                    </SvgIcon>
                );
                });

                AlignVertically.displayName = 'AlignVertically';

                export default AlignVertically;
            