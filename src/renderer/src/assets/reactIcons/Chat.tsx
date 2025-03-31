
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type ChatProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const Chat = React.forwardRef<SVGSVGElement, ChatProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M6.25 13.75h7.5v-1.5h-7.5zm0-3h11.5v-1.5H6.25zm0-3h11.5v-1.5H6.25zM2.5 21.039V4.307q0-.758.525-1.283T4.308 2.5h15.384q.758 0 1.283.525t.525 1.283v11.384q0 .758-.525 1.283t-1.283.525H6.038zM5.4 16h14.292a.3.3 0 0 0 .212-.096.3.3 0 0 0 .096-.212V4.308a.3.3 0 0 0-.096-.212.3.3 0 0 0-.212-.096H4.308a.3.3 0 0 0-.212.096.3.3 0 0 0-.096.212v13.077z" />
                    </SvgIcon>
                );
                });

                Chat.displayName = 'Chat';

                export default Chat;
            