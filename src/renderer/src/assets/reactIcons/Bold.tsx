
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type BoldProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const Bold = React.forwardRef<SVGSVGElement, BoldProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M7.338 18.504V5.254h4.861q1.53 0 2.765.952t1.235 2.563q0 1.122-.541 1.828t-1.166 1.026q.768.265 1.469 1.05.7.783.7 2.11 0 1.917-1.414 2.819t-2.848.902zm2.15-1.992h2.83q1.181 0 1.67-.656t.488-1.258-.488-1.258-1.716-.655H9.488zm0-5.758h2.594q.912 0 1.445-.521.534-.522.534-1.248 0-.774-.564-1.264-.565-.49-1.384-.49H9.488z" />
                    </SvgIcon>
                );
                });

                Bold.displayName = 'Bold';

                export default Bold;
            