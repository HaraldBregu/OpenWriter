
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type TabsProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const Tabs = React.forwardRef<SVGSVGElement, TabsProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M4.308 18h15.384a.3.3 0 0 0 .212-.096.3.3 0 0 0 .096-.212V10h-7V6H4.308a.3.3 0 0 0-.212.096.3.3 0 0 0-.096.212v11.384q0 .116.096.212a.3.3 0 0 0 .212.096m0 1.5q-.758 0-1.283-.525a1.75 1.75 0 0 1-.525-1.283V6.308q0-.758.525-1.283T4.308 4.5h15.384q.758 0 1.283.525t.525 1.283v11.384q0 .758-.525 1.283t-1.283.525z" />
                    </SvgIcon>
                );
                });

                Tabs.displayName = 'Tabs';

                export default Tabs;
            