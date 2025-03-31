
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type UnfoldMoreProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const UnfoldMore = React.forwardRef<SVGSVGElement, UnfoldMoreProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="m12 20.037-3.723-3.723.91-.91L12 18.219l2.814-2.813.91.91zM9.187 8.562l-.91-.91L12 3.93l3.723 3.723-.91.91L12 5.748z" />
                    </SvgIcon>
                );
                });

                UnfoldMore.displayName = 'UnfoldMore';

                export default UnfoldMore;
            