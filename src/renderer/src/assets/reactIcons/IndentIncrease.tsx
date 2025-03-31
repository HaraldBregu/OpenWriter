
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type IndentIncreaseProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const IndentIncrease = React.forwardRef<SVGSVGElement, IndentIncreaseProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M3.5 20.379v-1.5h17v1.5zm8-3.875v-1.5h9v1.5zm0-3.875v-1.5h9v1.5zm0-3.875v-1.5h9v1.5zm-8-3.875v-1.5h17v1.5zm0 10.404V8.475l3.404 3.404z" />
                    </SvgIcon>
                );
                });

                IndentIncrease.displayName = 'IndentIncrease';

                export default IndentIncrease;
            