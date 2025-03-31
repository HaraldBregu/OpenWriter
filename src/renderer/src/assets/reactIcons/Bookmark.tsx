
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type BookmarkProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const Bookmark = React.forwardRef<SVGSVGElement, BookmarkProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M5.5 20.25V5.308q0-.758.525-1.283T7.308 3.5h9.384q.758 0 1.283.525t.525 1.283V20.25L12 17.462zm1.5-2.3 5-2.15 5 2.15V5.308a.3.3 0 0 0-.096-.212.3.3 0 0 0-.212-.096H7.308a.3.3 0 0 0-.212.096.3.3 0 0 0-.096.212z" />
                    </SvgIcon>
                );
                });

                Bookmark.displayName = 'Bookmark';

                export default Bookmark;
            