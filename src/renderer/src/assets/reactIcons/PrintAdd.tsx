
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type PrintAddProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const PrintAdd = React.forwardRef<SVGSVGElement, PrintAddProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M18.299 20.795v-3h-3v-1.5h3v-3h1.5v3h3v1.5h-3v3zM6.5 20.497v-4H2.789v-5.692q0-1.063.726-1.782.726-.718 1.774-.718h13.423q1.062 0 1.781.718.72.72.72 1.782v.81a6 6 0 0 0-.72-.29q-.375-.125-.78-.17v-.289q0-.424-.288-.743a.92.92 0 0 0-.713-.318H5.29a.97.97 0 0 0-.712.287.97.97 0 0 0-.288.713v4.192h2.212v-1.77h8.011q-.294.33-.522.7a4.6 4.6 0 0 0-.39.8H8v4.27h5.437q.127.416.36.785.234.37.494.715zM16 8.305v-3H8v3H6.5v-4.5h11v4.5z" />
                    </SvgIcon>
                );
                });

                PrintAdd.displayName = 'PrintAdd';

                export default PrintAdd;
            