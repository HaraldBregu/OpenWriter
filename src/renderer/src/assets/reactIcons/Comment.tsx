
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type CommentProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const Comment = React.forwardRef<SVGSVGElement, CommentProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M6.25 13.875h7.5v-1.5h-7.5zm0-3h11.5v-1.5H6.25zm0-3h11.5v-1.5H6.25zM12 21.5l-2.483-3.75h-5.21a1.74 1.74 0 0 1-1.276-.531 1.74 1.74 0 0 1-.531-1.277V4.308q0-.746.531-1.277A1.74 1.74 0 0 1 4.308 2.5h15.384q.746 0 1.277.531t.531 1.277v11.634q0 .746-.531 1.277a1.74 1.74 0 0 1-1.277.531h-5.21zm0-2.706 1.677-2.544h6.015a.3.3 0 0 0 .221-.087.3.3 0 0 0 .087-.22V4.307a.3.3 0 0 0-.087-.221.3.3 0 0 0-.22-.087H4.307a.3.3 0 0 0-.221.087.3.3 0 0 0-.087.22v11.635a.3.3 0 0 0 .087.221.3.3 0 0 0 .22.087h6.016z" />
                    </SvgIcon>
                );
                });

                Comment.displayName = 'Comment';

                export default Comment;
            