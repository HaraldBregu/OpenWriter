
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type EventsProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const Events = React.forwardRef<SVGSVGElement, EventsProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M5.308 21.498q-.758 0-1.283-.525A1.75 1.75 0 0 1 3.5 19.69V6.306q0-.758.525-1.283t1.283-.525h1.384V2.383h1.539v2.115h7.577V2.383h1.5v2.115h1.384q.758 0 1.283.525t.525 1.283V19.69q0 .758-.525 1.283t-1.283.525zm0-1.5h13.384a.3.3 0 0 0 .212-.096.3.3 0 0 0 .096-.212v-9.384H5v9.384q0 .116.096.212a.3.3 0 0 0 .212.096M5 8.806h14v-2.5a.3.3 0 0 0-.096-.212.3.3 0 0 0-.212-.096H5.308a.3.3 0 0 0-.212.096.3.3 0 0 0-.096.212zm2.25 4.942v-1.5h9.5v1.5zm0 4v-1.5h6.5v1.5z" />
                    </SvgIcon>
                );
                });

                Events.displayName = 'Events';

                export default Events;
            