
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type ExportProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const Export = React.forwardRef<SVGSVGElement, ExportProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M7.038 21.172a1.52 1.52 0 0 1-1.118-.458 1.52 1.52 0 0 1-.457-1.118v-9.05q0-.66.457-1.118a1.52 1.52 0 0 1 1.118-.457h2.23v1.307h-2.23a.26.26 0 0 0-.184.084.26.26 0 0 0-.084.184v9.05q0 .1.084.185a.26.26 0 0 0 .184.084h9.922a.26.26 0 0 0 .184-.084.26.26 0 0 0 .084-.185v-9.05a.26.26 0 0 0-.084-.184.26.26 0 0 0-.184-.084h-2.229V8.971h2.23q.66 0 1.117.457.458.458.458 1.118v9.05q0 .66-.458 1.118a1.52 1.52 0 0 1-1.118.458zm4.308-5.883V5.676L9.733 7.288l-.918-.932 3.184-3.184 3.185 3.184-.919.932-1.612-1.612v9.613z" />
                    </SvgIcon>
                );
                });

                Export.displayName = 'Export';

                export default Export;
            