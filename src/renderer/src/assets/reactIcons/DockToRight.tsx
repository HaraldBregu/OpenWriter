
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type DockToRightProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const DockToRight = React.forwardRef<SVGSVGElement, DockToRightProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M5.308 20.5q-.748 0-1.278-.53a1.74 1.74 0 0 1-.53-1.278V5.308q0-.748.53-1.278t1.278-.53h13.384q.749 0 1.278.53.53.53.53 1.278v13.384q0 .749-.53 1.278-.53.53-1.278.53zM8 19V5H5.308a.3.3 0 0 0-.212.096.3.3 0 0 0-.096.212v13.384q0 .116.096.212a.3.3 0 0 0 .212.096zm1.5 0h9.192a.3.3 0 0 0 .212-.096.3.3 0 0 0 .096-.212V5.308a.3.3 0 0 0-.096-.212.3.3 0 0 0-.212-.096H9.5z" />
                    </SvgIcon>
                );
                });

                DockToRight.displayName = 'DockToRight';

                export default DockToRight;
            