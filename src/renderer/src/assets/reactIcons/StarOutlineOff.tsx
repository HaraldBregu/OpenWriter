
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type StarOutlineOffProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const StarOutlineOff = React.forwardRef<SVGSVGElement, StarOutlineOffProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M21 19.971 3.176 3 2 4.114l5.248 4.972-4.434.343 4.976 4.114-1.447 6 5.61-3.172 5.609 3.172-.271-1.029L19.914 21zm-5.7-3.257-3.438-1.971-3.438 1.971.905-3.685-2.986-2.486 2.262-.172zM11.138 8.4l-1.086-1.029 1.81-4.114 2.533 5.657 6.515.515-4.615 3.771-.995-.943 2.171-1.714-3.98-.343-1.539-3.429z" />
                    </SvgIcon>
                );
                });

                StarOutlineOff.displayName = 'StarOutlineOff';

                export default StarOutlineOff;
            