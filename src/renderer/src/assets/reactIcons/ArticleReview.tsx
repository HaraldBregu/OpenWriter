
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type ArticleReviewProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const ArticleReview = React.forwardRef<SVGSVGElement, ArticleReviewProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path fillRule="evenodd" d="M5.45 3.723a1.95 1.95 0 0 0-1.95 1.95v12.654a1.95 1.95 0 0 0 1.95 1.95h4.445v-1.5H5.45a.45.45 0 0 1-.45-.45V5.673a.45.45 0 0 1 .45-.45h10.773a.45.45 0 0 1 .45.45v8.68h1.5v-8.68a1.95 1.95 0 0 0-1.95-1.95zm1.8 3.527h7.461v1.5H7.25zm0 3h7.461v1.5H7.25zm0 3h3.98v1.5H7.25zm6.872 3.553a6.65 6.65 0 0 1 3.512-.976q1.902 0 3.513.976a7.4 7.4 0 0 1 2.568 2.608l.075.127-.075.127a7.4 7.4 0 0 1-2.568 2.608 6.65 6.65 0 0 1-3.512.977 6.65 6.65 0 0 1-3.513-.977 7.4 7.4 0 0 1-2.568-2.608l-.075-.127.075-.127a7.4 7.4 0 0 1 2.568-2.608m3.512.524q-1.322 0-2.5.639a6.1 6.1 0 0 0-1.876 1.572 6.1 6.1 0 0 0 1.876 1.573 5.16 5.16 0 0 0 2.5.639q1.323 0 2.502-.64a6.1 6.1 0 0 0 1.876-1.572 6.1 6.1 0 0 0-1.876-1.572 5.16 5.16 0 0 0-2.501-.64m-.883 1.328c.242-.242.541-.367.883-.367.343 0 .642.125.884.367s.366.541.366.883c0 .343-.124.642-.366.884a1.21 1.21 0 0 1-.884.366c-.341 0-.64-.124-.883-.366v-.41a1 1 0 0 1-.117-.474q0-.261.117-.474z" clipRule="evenodd" />
                    </SvgIcon>
                );
                });

                ArticleReview.displayName = 'ArticleReview';

                export default ArticleReview;
            