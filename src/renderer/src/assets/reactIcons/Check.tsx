
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type CheckProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const Check = React.forwardRef<SVGSVGElement, CheckProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="m9.55 17.655-5.335-5.334 1.069-1.07 4.265 4.266 9.166-9.165 1.069 1.069z" />
                    </SvgIcon>
                );
                });

                Check.displayName = 'Check';

                export default Check;
            