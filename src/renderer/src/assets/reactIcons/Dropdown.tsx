
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type DropdownProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const Dropdown = React.forwardRef<SVGSVGElement, DropdownProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M12 14.308 8.19 10.5h7.616z" />
                    </SvgIcon>
                );
                });

                Dropdown.displayName = 'Dropdown';

                export default Dropdown;
            