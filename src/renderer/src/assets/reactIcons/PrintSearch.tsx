
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type PrintSearchProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const PrintSearch = React.forwardRef<SVGSVGElement, PrintSearchProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <g><path d="M5.3 19.899v-3.6H1.988v-5.693q0-.787.551-1.344.551-.555 1.35-.556H17.71q.787 0 1.344.556.556.557.556 1.344v.51a3 3 0 0 0-.631-.151 11 11 0 0 0-.669-.059v-.288a1.066 1.066 0 0 0-.975-.612H4.238a.92.92 0 0 0-.677.276.93.93 0 0 0-.273.684V15H5.3v-1.57h7.886q-.195.304-.36.624-.165.322-.276.676H6.6v3.87h5.786q.101.364.248.685.147.32.331.614zM15 8.705v-3H6.6v3H5.3v-4.3h11v4.3z" /><path d="M17.747 18.842q1.074 0 1.817-.737.743-.738.743-1.811t-.74-1.816q-.738-.744-1.814-.743-.867 0-1.71.643-.844.643-.844 1.91 0 1.075.738 1.815t1.81.739m4.731 3.09-2.489-2.513q-.48.344-1.046.534a3.7 3.7 0 0 1-1.178.189q-1.617 0-2.742-1.124t-1.124-2.73q0-1.605 1.124-2.73 1.125-1.123 2.73-1.123t2.73 1.124q1.124 1.124 1.124 2.73 0 .615-.19 1.185t-.533 1.05l2.513 2.49z" /></g>
                    </SvgIcon>
                );
                });

                PrintSearch.displayName = 'PrintSearch';

                export default PrintSearch;
            