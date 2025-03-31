
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type LinkAddProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const LinkAdd = React.forwardRef<SVGSVGElement, LinkAddProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M17.037 19.5v-2.962h-2.962v-1.5h2.962v-2.962h1.5v2.962h2.961v1.5h-2.962v2.961zm-6.231-2.962h-3.77q-1.883 0-3.21-1.328Q2.498 13.883 2.498 12t1.328-3.211Q5.154 7.46 7.036 7.46h3.77v1.5h-3.77q-1.26 0-2.148.89a2.93 2.93 0 0 0-.89 2.148q0 1.26.89 2.15.888.889 2.149.889h3.769zm-2.558-3.789v-1.5h7.5v1.5zm13.25-.75h-1.5q0-1.26-.89-2.149a2.93 2.93 0 0 0-2.149-.89H13.19v-1.5h3.77q1.883 0 3.21 1.328 1.328 1.328 1.328 3.211" />
                    </SvgIcon>
                );
                });

                LinkAdd.displayName = 'LinkAdd';

                export default LinkAdd;
            