
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type RestoreProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const Restore = React.forwardRef<SVGSVGElement, RestoreProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M16.908 18.39v-1.5H9.731q-1.565 0-2.694-1.033-1.128-1.034-1.129-2.553 0-1.52 1.13-2.548Q8.165 9.727 9.73 9.727h7.022L13.97 12.51l1.054 1.054 4.586-4.587-4.586-4.586-1.054 1.053 2.783 2.783H9.73q-2.193 0-3.758 1.465-1.565 1.464-1.565 3.612t1.565 3.617q1.565 1.47 3.758 1.47z" />
                    </SvgIcon>
                );
                });

                Restore.displayName = 'Restore';

                export default Restore;
            