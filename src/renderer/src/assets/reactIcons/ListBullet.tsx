
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type ListBulletProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const ListBullet = React.forwardRef<SVGSVGElement, ListBulletProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M12 15q-1.253 0-2.126-.873Q9 13.254 9 12.001q0-1.254.873-2.127Q10.746 9 11.999 9q1.254 0 2.127.873.874.873.874 2.126 0 1.254-.873 2.127-.873.874-2.126.874" />
                    </SvgIcon>
                );
                });

                ListBullet.displayName = 'ListBullet';

                export default ListBullet;
            