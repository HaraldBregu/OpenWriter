
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type PlayProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const Play = React.forwardRef<SVGSVGElement, PlayProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M8.5 18.098V5.906l9.577 6.096z" />
                    </SvgIcon>
                );
                });

                Play.displayName = 'Play';

                export default Play;
            