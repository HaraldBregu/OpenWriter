
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type UnderlineProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const Underline = React.forwardRef<SVGSVGElement, UnderlineProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M4.98 21.005v-1.5h13.308v1.5zm6.654-3.597q-2.333 0-3.641-1.416-1.31-1.417-1.309-3.795V4.293h1.854v7.996q0 1.515.806 2.429.805.914 2.29.914 1.486 0 2.29-.914.806-.914.806-2.429V4.293h1.854v7.904q0 2.378-1.309 3.795t-3.64 1.416" />
                    </SvgIcon>
                );
                });

                Underline.displayName = 'Underline';

                export default Underline;
            