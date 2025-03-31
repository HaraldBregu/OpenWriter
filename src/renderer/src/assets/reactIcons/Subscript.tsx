
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type SubscriptProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const Subscript = React.forwardRef<SVGSVGElement, SubscriptProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path fillRule="evenodd" d="M10.464 5 5 19h1.83l1.413-3.737h6.198L15.853 19h1.87L12.26 5zm3.415 8.711H8.805l2.485-6.533h.124zm6.144-1.327V19h1.02v-8h-.738L18 12.643l.532.795z" clipRule="evenodd" />
                    </SvgIcon>
                );
                });

                Subscript.displayName = 'Subscript';

                export default Subscript;
            