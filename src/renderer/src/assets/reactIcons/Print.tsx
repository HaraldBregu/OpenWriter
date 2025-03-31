
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type PrintProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const Print = React.forwardRef<SVGSVGElement, PrintProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M16 8.305v-3H8v3H6.5v-4.5h11v4.5zm1.808 4q.425 0 .713-.288a.97.97 0 0 0 .287-.712.97.97 0 0 0-.287-.713.97.97 0 0 0-.713-.287.97.97 0 0 0-.712.287.97.97 0 0 0-.288.713q0 .424.288.712t.712.288m-1.807 6.692v-4.27H8v4.27zm1.5 1.5h-11v-4H2.789v-5.692q0-1.063.726-1.782.726-.718 1.774-.718h13.423q1.062 0 1.781.718.72.72.72 1.782v5.692H17.5zm2.211-5.5v-4.192a.97.97 0 0 0-.287-.713.97.97 0 0 0-.713-.287H5.29a.97.97 0 0 0-.712.287.97.97 0 0 0-.288.713v4.192h2.212v-1.77h11v1.77z" />
                    </SvgIcon>
                );
                });

                Print.displayName = 'Print';

                export default Print;
            