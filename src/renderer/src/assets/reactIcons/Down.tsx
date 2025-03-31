
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type DownProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const Down = React.forwardRef<SVGSVGElement, DownProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="m12 21.502-6.674-6.673 1.044-1.045 4.88 4.864V2.492h1.5v16.146l4.878-4.879 1.044 1.07z" />
                    </SvgIcon>
                );
                });

                Down.displayName = 'Down';

                export default Down;
            