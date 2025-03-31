
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type ListBullet_emptyProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const ListBullet_empty = React.forwardRef<SVGSVGElement, ListBullet_emptyProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M12 17q-2.076 0-3.538-1.462T7 12t1.462-3.538T12 7q2.076 0 3.538 1.462T17 12t-1.462 3.538T12 17m0-1.154q1.596 0 2.721-1.125T15.846 12t-1.125-2.721T12 8.154 9.279 9.279 8.154 12t1.125 2.721T12 15.846" />
                    </SvgIcon>
                );
                });

                ListBullet_empty.displayName = 'ListBullet_empty';

                export default ListBullet_empty;
            