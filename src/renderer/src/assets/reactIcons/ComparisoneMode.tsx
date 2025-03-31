
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type ComparisoneModeProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const ComparisoneMode = React.forwardRef<SVGSVGElement, ComparisoneModeProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path fillRule="evenodd" d="M13.718 19.975q.525.525 1.283.525h3.384q.758 0 1.283-.525t.525-1.283V5.308q0-.758-.525-1.283a1.75 1.75 0 0 0-1.283-.525h-3.384q-.758 0-1.283.525t-.525 1.283V11.5H10.81V5.308q0-.758-.525-1.283A1.75 1.75 0 0 0 9 3.5H5.616q-.757 0-1.282.525t-.525 1.283v13.384q0 .758.525 1.283t1.282.525h3.385q.758 0 1.283-.525t.525-1.283V13h2.384v5.692q0 .758.525 1.283M9.308 11.5H8V13h1.309v5.692a.3.3 0 0 1-.097.212.3.3 0 0 1-.211.096H5.616a.3.3 0 0 1-.211-.096.3.3 0 0 1-.096-.212V5.308q0-.116.096-.212A.3.3 0 0 1 5.616 5h3.385q.115 0 .211.096a.3.3 0 0 1 .097.212zm5.385 0V5.308q0-.116.096-.212A.3.3 0 0 1 15.001 5h3.384q.116 0 .212.096a.3.3 0 0 1 .096.212v13.384a.3.3 0 0 1-.096.212.3.3 0 0 1-.212.096h-3.384a.3.3 0 0 1-.212-.096.3.3 0 0 1-.096-.212V13H16v-1.5z" clipRule="evenodd" />
                    </SvgIcon>
                );
                });

                ComparisoneMode.displayName = 'ComparisoneMode';

                export default ComparisoneMode;
            