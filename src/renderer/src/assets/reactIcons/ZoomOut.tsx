
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type ZoomOutProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const ZoomOut = React.forwardRef<SVGSVGElement, ZoomOutProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="m19.543 20.575-6.281-6.28q-.75.618-1.725.968t-2.017.35q-2.565 0-4.34-1.775Q3.404 12.063 3.404 9.5q0-2.565 1.776-4.34 1.775-1.777 4.338-1.777t4.34 1.776 1.777 4.34q0 1.07-.36 2.045a5.7 5.7 0 0 1-.96 1.696l6.281 6.281zM9.52 14.114q1.932 0 3.274-1.342 1.341-1.34 1.341-3.274 0-1.932-1.341-3.274-1.342-1.341-3.274-1.341-1.933 0-3.274 1.341-1.342 1.342-1.342 3.274 0 1.933 1.342 3.274 1.34 1.342 3.274 1.342m-2.385-3.866v-1.5h4.769v1.5z" />
                    </SvgIcon>
                );
                });

                ZoomOut.displayName = 'ZoomOut';

                export default ZoomOut;
            