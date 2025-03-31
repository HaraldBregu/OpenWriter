
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type LogoutProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const Logout = React.forwardRef<SVGSVGElement, LogoutProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M5.308 20.5q-.758 0-1.283-.525a1.75 1.75 0 0 1-.525-1.283V5.308q0-.758.525-1.283T5.308 3.5h6.701V5H5.309a.3.3 0 0 0-.212.096.3.3 0 0 0-.096.212v13.384q0 .116.096.212a.3.3 0 0 0 .212.096h6.701v1.5zm10.923-4.23-1.039-1.085 2.435-2.435h-8.53v-1.5h8.53l-2.435-2.434 1.039-1.085L20.5 12z" />
                    </SvgIcon>
                );
                });

                Logout.displayName = 'Logout';

                export default Logout;
            