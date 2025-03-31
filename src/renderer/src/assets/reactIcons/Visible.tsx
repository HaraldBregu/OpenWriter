
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type VisibleProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const Visible = React.forwardRef<SVGSVGElement, VisibleProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M12.003 15.577q1.7 0 2.887-1.19t1.188-2.89-1.19-2.886-2.89-1.188-2.887 1.19-1.187 2.89 1.19 2.887 2.889 1.187M12 14.2q-1.125 0-1.913-.787a2.6 2.6 0 0 1-.787-1.913q0-1.125.787-1.912a2.6 2.6 0 0 1 1.913-.788q1.125 0 1.912.787.788.788.788 1.913t-.788 1.912a2.6 2.6 0 0 1-1.912.788m0 4.3q-3.448 0-6.285-1.903Q2.881 14.693 1.54 11.5 2.88 8.306 5.715 6.403T11.999 4.5t6.286 1.903q2.836 1.904 4.177 5.097-1.34 3.195-4.175 5.097T12.002 18.5m0-1.5a9.54 9.54 0 0 0 5.187-1.488 9.77 9.77 0 0 0 3.613-4.012 9.77 9.77 0 0 0-3.613-4.012A9.55 9.55 0 0 0 12.001 6a9.55 9.55 0 0 0-5.188 1.487A9.77 9.77 0 0 0 3.201 11.5a9.77 9.77 0 0 0 3.612 4.012A9.54 9.54 0 0 0 12.001 17" />
                    </SvgIcon>
                );
                });

                Visible.displayName = 'Visible';

                export default Visible;
            