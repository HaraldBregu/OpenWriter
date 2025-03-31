
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type MoreProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const More = React.forwardRef<SVGSVGElement, MoreProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M12 19.269q-.619 0-1.06-.44a1.44 1.44 0 0 1-.44-1.06q0-.618.44-1.06.442-.44 1.06-.44t1.06.44q.44.441.44 1.06 0 .62-.44 1.06-.442.44-1.06.44m0-5.77q-.619 0-1.06-.44a1.44 1.44 0 0 1-.44-1.06q0-.618.44-1.059.442-.44 1.06-.44t1.06.44q.44.44.44 1.06 0 .618-.44 1.059-.442.44-1.06.44m0-5.769q-.619 0-1.06-.44a1.44 1.44 0 0 1-.44-1.06q0-.618.44-1.059.442-.44 1.06-.44t1.06.44q.44.44.44 1.06 0 .618-.44 1.059-.442.44-1.06.44" />
                    </SvgIcon>
                );
                });

                More.displayName = 'More';

                export default More;
            