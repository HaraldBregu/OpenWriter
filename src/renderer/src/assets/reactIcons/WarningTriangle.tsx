
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type WarningTriangleProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const WarningTriangle = React.forwardRef<SVGSVGElement, WarningTriangleProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <g><path d="m2.73 19.999 9.27-16 9.27 16zm1.72-1h15.1l-7.55-13zM12 17.614q.261 0 .438-.177a.6.6 0 0 0 .177-.438.6.6 0 0 0-.177-.439.6.6 0 0 0-.438-.177.6.6 0 0 0-.439.177.6.6 0 0 0-.177.439q0 .261.177.438a.6.6 0 0 0 .439.177m-.5-2.23h1v-5h-1z" /><path fillRule="evenodd" d="m12 3.5 9.703 16.749H2.297zm0 .997L3.164 19.75h17.671zm0 1.004 7.984 13.748H4.016zM4.884 18.749h14.232L12 6.497zm6.366-8.616h1.5v5.5h-1.5zm.5.5v4.5h.5v-4.5zm-.365 5.75a.85.85 0 0 1 .615-.25c.237 0 .448.083.615.25.167.168.25.378.25.616a.85.85 0 0 1-.25.615.85.85 0 0 1-.615.25.85.85 0 0 1-.615-.25.85.85 0 0 1-.25-.615c0-.238.082-.448.25-.616m.615.25a.35.35 0 0 0-.262.104.35.35 0 0 0-.104.262c0 .111.035.193.104.261.069.07.15.104.262.104a.35.35 0 0 0 .262-.104.35.35 0 0 0 .103-.261.35.35 0 0 0-.103-.262.35.35 0 0 0-.262-.104" clipRule="evenodd" /></g>
                    </SvgIcon>
                );
                });

                WarningTriangle.displayName = 'WarningTriangle';

                export default WarningTriangle;
            