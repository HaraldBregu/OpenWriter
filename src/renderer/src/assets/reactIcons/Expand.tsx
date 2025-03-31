
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type ExpandProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const Expand = React.forwardRef<SVGSVGElement, ExpandProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M12 15.055 6.345 9.401l1.053-1.053 4.6 4.6 4.6-4.6L17.653 9.4z" />
                    </SvgIcon>
                );
                });

                Expand.displayName = 'Expand';

                export default Expand;
            