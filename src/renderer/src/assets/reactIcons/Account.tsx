
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type AccountProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const Account = React.forwardRef<SVGSVGElement, AccountProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M12 11.691q-1.444 0-2.472-1.028T8.5 8.191 9.528 5.72Q10.557 4.69 12 4.69t2.472 1.029Q15.5 6.748 15.5 8.19t-1.028 2.472T12 11.691m-7.5 7.616v-2.223q0-.735.399-1.36a2.66 2.66 0 0 1 1.066-.963 14.5 14.5 0 0 1 2.992-1.09 12.95 12.95 0 0 1 6.086 0q1.509.363 2.992 1.09.667.336 1.066.962t.399 1.36v2.224zm1.5-1.5h12v-.723a1 1 0 0 0-.176-.563 1.33 1.33 0 0 0-.478-.422 13 13 0 0 0-2.635-.964 11.4 11.4 0 0 0-5.422 0q-1.343.328-2.635.964-.301.165-.478.422a1 1 0 0 0-.176.563zm6-7.616q.825 0 1.412-.587Q14 9.016 14 8.19t-.588-1.412A1.93 1.93 0 0 0 12 6.19q-.825 0-1.412.588A1.93 1.93 0 0 0 10 8.19q0 .825.588 1.413.587.587 1.412.587" />
                    </SvgIcon>
                );
                });

                Account.displayName = 'Account';

                export default Account;
            