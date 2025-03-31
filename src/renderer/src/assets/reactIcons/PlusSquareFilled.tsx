
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type PlusSquareFilledProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const PlusSquareFilled = React.forwardRef<SVGSVGElement, PlusSquareFilledProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M11.25 16.75h1.5v-4h4v-1.5h-4v-4h-1.5v4h-4v1.5h4zM5.308 20.5q-.758 0-1.283-.525a1.75 1.75 0 0 1-.525-1.283V5.308q0-.758.525-1.283T5.308 3.5h13.384q.758 0 1.283.525t.525 1.283v13.384q0 .758-.525 1.283t-1.283.525z" />
                    </SvgIcon>
                );
                });

                PlusSquareFilled.displayName = 'PlusSquareFilled';

                export default PlusSquareFilled;
            