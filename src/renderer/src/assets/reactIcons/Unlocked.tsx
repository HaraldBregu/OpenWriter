
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type UnlockedProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const Unlocked = React.forwardRef<SVGSVGElement, UnlockedProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M6.308 8.5H15v-2q0-1.25-.875-2.125A2.9 2.9 0 0 0 12 3.5q-1.25 0-2.125.875A2.9 2.9 0 0 0 9 6.5H7.5q0-1.873 1.313-3.186Q10.128 2 12 2t3.187 1.314Q16.5 4.626 16.5 6.5v2h1.192q.749 0 1.278.53.53.53.53 1.278v9.384q0 .749-.53 1.278-.53.53-1.278.53H6.308q-.748 0-1.278-.53a1.74 1.74 0 0 1-.53-1.278v-9.384q0-.748.53-1.278t1.278-.53m0 11.5h11.384a.3.3 0 0 0 .221-.087.3.3 0 0 0 .087-.22v-9.385a.3.3 0 0 0-.087-.222.3.3 0 0 0-.22-.086H6.307a.3.3 0 0 0-.221.086.3.3 0 0 0-.087.222v9.384a.3.3 0 0 0 .087.221.3.3 0 0 0 .22.087M12 16.75q.729 0 1.24-.51.51-.511.51-1.24t-.51-1.24-1.24-.51-1.24.51q-.51.511-.51 1.24t.51 1.24 1.24.51" />
                    </SvgIcon>
                );
                });

                Unlocked.displayName = 'Unlocked';

                export default Unlocked;
            