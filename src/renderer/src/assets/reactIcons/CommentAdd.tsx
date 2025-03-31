
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type CommentAddProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const CommentAdd = React.forwardRef<SVGSVGElement, CommentAddProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M11.248 13.754h1.5v-3h3v-1.5h-3v-3h-1.5v3h-3v1.5h3zm-8.75 7.288V4.312q0-.759.525-1.283.525-.525 1.283-.525H19.69q.758 0 1.283.525t.525 1.283v11.384q0 .758-.525 1.283t-1.283.525H6.037zm2.9-5.038H19.69a.3.3 0 0 0 .212-.096.3.3 0 0 0 .096-.212V4.312a.3.3 0 0 0-.096-.212.3.3 0 0 0-.212-.096H4.306a.3.3 0 0 0-.212.096.3.3 0 0 0-.096.212v13.077z" />
                    </SvgIcon>
                );
                });

                CommentAdd.displayName = 'CommentAdd';

                export default CommentAdd;
            