
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type CameraProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const Camera = React.forwardRef<SVGSVGElement, CameraProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M12 17.115q1.722 0 2.918-1.197 1.197-1.196 1.197-2.918t-1.197-2.918Q13.722 8.885 12 8.885t-2.918 1.197Q7.885 11.278 7.885 13t1.197 2.918T12 17.115m0-1.5q-1.108.001-1.861-.754-.755-.753-.755-1.861t.755-1.861q.753-.755 1.861-.755t1.861.755q.755.753.755 1.861t-.755 1.861q-.753.755-1.861.755M4.308 20.5q-.758 0-1.283-.525a1.75 1.75 0 0 1-.525-1.283V7.308q0-.758.525-1.283T4.308 5.5h3.054l1.85-2h5.577l1.85 2h3.053q.758 0 1.283.525t.525 1.283v11.384q0 .758-.525 1.283t-1.283.525zm0-1.5h15.384a.3.3 0 0 0 .221-.087.3.3 0 0 0 .087-.22V7.307a.3.3 0 0 0-.087-.221.3.3 0 0 0-.22-.087h-3.724l-1.835-2H9.866L8.03 7H4.308a.3.3 0 0 0-.221.087.3.3 0 0 0-.087.22v11.385a.3.3 0 0 0 .087.221.3.3 0 0 0 .22.087" />
                    </SvgIcon>
                );
                });

                Camera.displayName = 'Camera';

                export default Camera;
            