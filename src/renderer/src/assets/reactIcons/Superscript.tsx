
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type SuperscriptProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const Superscript = React.forwardRef<SVGSVGElement, SuperscriptProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path fillRule="evenodd" d="M10.464 5 5 19h1.83l1.413-3.737h6.198L15.853 19h1.87L12.26 5zm3.415 8.711H8.805l2.485-6.533h.124zm4.144-7.327V13h1.02V5h-.738L16 6.643l.532.795z" clipRule="evenodd" />
                    </SvgIcon>
                );
                });

                Superscript.displayName = 'Superscript';

                export default Superscript;
            