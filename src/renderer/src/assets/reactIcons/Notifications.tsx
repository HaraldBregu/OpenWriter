
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type NotificationsProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const Notifications = React.forwardRef<SVGSVGElement, NotificationsProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M4.5 18.885v-1.5h1.808V9.923q0-2.017 1.245-3.567a5.52 5.52 0 0 1 3.197-1.983V3.75q0-.52.364-.885Q11.48 2.5 12 2.5t.885.365.366.885v.623a5.52 5.52 0 0 1 3.197 1.983q1.245 1.55 1.245 3.567v7.462H19.5v1.5zm7.498 2.807q-.746 0-1.276-.53a1.74 1.74 0 0 1-.53-1.277h3.616q0 .747-.532 1.277-.531.53-1.278.53m-4.19-4.307h8.384V9.923q0-1.737-1.228-2.964Q13.737 5.73 12 5.73T9.036 6.959Q7.808 8.186 7.808 9.923z" />
                    </SvgIcon>
                );
                });

                Notifications.displayName = 'Notifications';

                export default Notifications;
            