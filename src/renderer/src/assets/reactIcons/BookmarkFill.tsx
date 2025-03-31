
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type BookmarkFillProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const BookmarkFill = React.forwardRef<SVGSVGElement, BookmarkFillProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M5.5 20.25V5.308q0-.758.525-1.283T7.308 3.5h9.384q.758 0 1.283.525t.525 1.283V20.25L12 17.462z" />
                    </SvgIcon>
                );
                });

                BookmarkFill.displayName = 'BookmarkFill';

                export default BookmarkFill;
            