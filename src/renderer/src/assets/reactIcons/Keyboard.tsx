
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type KeyboardProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const Keyboard = React.forwardRef<SVGSVGElement, KeyboardProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M4.308 18.5q-.758 0-1.283-.525a1.75 1.75 0 0 1-.525-1.283V7.308q0-.758.525-1.283T4.308 5.5h15.384q.758 0 1.283.525t.525 1.283v9.384q0 .758-.525 1.283t-1.283.525zm0-1.5h15.384a.3.3 0 0 0 .212-.096.3.3 0 0 0 .096-.212V7.308a.3.3 0 0 0-.096-.212.3.3 0 0 0-.212-.096H4.308a.3.3 0 0 0-.212.096.3.3 0 0 0-.096.212v9.384q0 .116.096.212a.3.3 0 0 0 .212.096m3.808-1.116h7.768v-1.768H8.116zm-3-3h1.769v-1.768h-1.77zm3 0h1.768v-1.768H8.116zm3 0h1.768v-1.768h-1.768zm3 0h1.768v-1.768h-1.768zm3 0h1.768v-1.768h-1.768zm-12-3h1.769V8.116h-1.77zm3 0h1.768V8.116H8.116zm3 0h1.768V8.116h-1.768zm3 0h1.768V8.116h-1.768zm3 0h1.768V8.116h-1.768z" />
                    </SvgIcon>
                );
                });

                Keyboard.displayName = 'Keyboard';

                export default Keyboard;
            