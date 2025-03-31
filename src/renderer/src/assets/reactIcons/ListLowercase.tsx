
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type ListLowercaseProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const ListLowercase = React.forwardRef<SVGSVGElement, ListLowercaseProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M11.25 16q-1.255 0-2.002-.688-.748-.689-.748-1.768 0-1.113.873-1.808.874-.694 2.245-.694.571 0 1.139.108.566.108.988.298v-.457q0-.876-.518-1.369-.517-.493-1.443-.493-.562 0-1.037.215a2.9 2.9 0 0 0-.884.638L8.93 9.24a3.9 3.9 0 0 1 1.3-.939q.7-.3 1.57-.301 1.628 0 2.424.797.797.798.797 2.392v4.563h-1.276V14.75h-.103a2.63 2.63 0 0 1-1.003.936q-.603.314-1.39.314m.19-1.113q.98 0 1.65-.687t.67-1.67a3.2 3.2 0 0 0-.886-.322 4.8 4.8 0 0 0-1.036-.116q-.924 0-1.456.385-.534.386-.533 1.067 0 .574.447.958.446.385 1.143.385" />
                    </SvgIcon>
                );
                });

                ListLowercase.displayName = 'ListLowercase';

                export default ListLowercase;
            