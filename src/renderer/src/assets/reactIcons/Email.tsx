
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type EmailProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const Email = React.forwardRef<SVGSVGElement, EmailProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M4.308 19.5q-.758 0-1.283-.525a1.75 1.75 0 0 1-.525-1.283V6.308q0-.758.525-1.283T4.308 4.5h15.384q.758 0 1.283.525t.525 1.283v11.384q0 .758-.525 1.283t-1.283.525zM12 12.558 4 7.442v10.25a.3.3 0 0 0 .087.221.3.3 0 0 0 .22.087h15.385a.3.3 0 0 0 .221-.087.3.3 0 0 0 .087-.22V7.442zM12 11l7.846-5H4.154zM4 7.442V6v11.692a.3.3 0 0 0 .087.221.3.3 0 0 0 .22.087H4z" />
                    </SvgIcon>
                );
                });

                Email.displayName = 'Email';

                export default Email;
            