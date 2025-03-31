
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type ListNumberProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const ListNumber = React.forwardRef<SVGSVGElement, ListNumberProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M11.777 18.481V7.761L9.362 9.47 8.5 8.18l3.735-2.661h1.196V18.48z" />
                    </SvgIcon>
                );
                });

                ListNumber.displayName = 'ListNumber';

                export default ListNumber;
            