
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type LocationProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const Location = React.forwardRef<SVGSVGElement, LocationProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M12 11.865q.747 0 1.277-.531.53-.532.53-1.278t-.532-1.276a1.75 1.75 0 0 0-1.278-.53q-.745 0-1.276.531-.53.532-.53 1.278t.532 1.277 1.278.53m0 7.649q2.934-2.628 4.49-5.04t1.557-4.226q0-2.735-1.737-4.496T12 3.991q-2.574 0-4.311 1.761T5.95 10.248q0 1.814 1.557 4.226t4.491 5.04m0 1.995q-3.776-3.27-5.662-6.088T4.45 10.248q0-3.462 2.24-5.605Q8.93 2.5 11.998 2.5t5.309 2.143q2.24 2.144 2.24 5.605 0 2.356-1.887 5.173t-5.662 6.089" />
                    </SvgIcon>
                );
                });

                Location.displayName = 'Location';

                export default Location;
            