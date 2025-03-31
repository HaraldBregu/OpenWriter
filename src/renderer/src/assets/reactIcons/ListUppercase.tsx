
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type ListUppercaseProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const ListUppercase = React.forwardRef<SVGSVGElement, ListUppercaseProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="m6 19 5.464-14h1.795l5.465 14h-1.871l-1.412-3.737H9.243L7.83 19zm3.805-5.289h5.074l-2.465-6.533h-.124z" />
                    </SvgIcon>
                );
                });

                ListUppercase.displayName = 'ListUppercase';

                export default ListUppercase;
            