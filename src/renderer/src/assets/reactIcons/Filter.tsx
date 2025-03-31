
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type FilterProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const Filter = React.forwardRef<SVGSVGElement, FilterProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M11.25 20.75v-5.5h1.5v2h8v1.5h-8v2zm-8-2v-1.5h5.5v1.5zm4-4v-2h-4v-1.5h4v-2h1.5v5.5zm4-2v-1.5h9.5v1.5zm4-4v-5.5h1.5v2h4v1.5h-4v2zm-12-2v-1.5h9.5v1.5z" />
                    </SvgIcon>
                );
                });

                Filter.displayName = 'Filter';

                export default Filter;
            