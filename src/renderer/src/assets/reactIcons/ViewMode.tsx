
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type ViewModeProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const ViewMode = React.forwardRef<SVGSVGElement, ViewModeProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M3.5 13V5.308q0-.758.525-1.283T5.308 3.5H11V13zM13 3.5h5.692q.758 0 1.283.525t.525 1.286V9H13zm0 17V11h7.5v7.692q0 .758-.525 1.283t-1.283.525zM3.5 15H11v5.5H5.308q-.758 0-1.283-.525a1.75 1.75 0 0 1-.525-1.286zM5 11.5h4.5V5H5.308a.3.3 0 0 0-.221.087.3.3 0 0 0-.087.22zm9.5-4H19V5.308a.3.3 0 0 0-.087-.221.3.3 0 0 0-.22-.087H14.5zm0 5V19h4.192a.3.3 0 0 0 .221-.087.3.3 0 0 0 .087-.22V12.5zm-9.5 4v2.192a.3.3 0 0 0 .087.221.3.3 0 0 0 .22.087H9.5v-2.5z" />
                    </SvgIcon>
                );
                });

                ViewMode.displayName = 'ViewMode';

                export default ViewMode;
            