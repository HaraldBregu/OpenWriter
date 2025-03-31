
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type ReplyProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const Reply = React.forwardRef<SVGSVGElement, ReplyProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M19 18.498v-3.5a3.13 3.13 0 0 0-.952-2.298 3.13 3.13 0 0 0-2.298-.952H6.373l3.85 3.85-1.07 1.053L3.5 10.998l5.654-5.654 1.069 1.053-3.85 3.85h9.377q1.97 0 3.36 1.391 1.39 1.39 1.39 3.36v3.5z" />
                    </SvgIcon>
                );
                });

                Reply.displayName = 'Reply';

                export default Reply;
            