
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type DeleteProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const Delete = React.forwardRef<SVGSVGElement, DeleteProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M7.308 20.502q-.748 0-1.278-.53a1.74 1.74 0 0 1-.53-1.278V6.002h-1v-1.5H9v-.885h6v.885h4.5v1.5h-1v12.692q0 .758-.525 1.283t-1.283.525zM17 6.002H7v12.692a.3.3 0 0 0 .087.221.3.3 0 0 0 .22.087h9.385a.3.3 0 0 0 .212-.097.3.3 0 0 0 .096-.211zm-7.596 11h1.5v-9h-1.5zm3.692 0h1.5v-9h-1.5z" />
                    </SvgIcon>
                );
                });

                Delete.displayName = 'Delete';

                export default Delete;
            