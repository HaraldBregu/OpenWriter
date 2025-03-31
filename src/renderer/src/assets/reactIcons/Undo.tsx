
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type UndoProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const Undo = React.forwardRef<SVGSVGElement, UndoProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M7.11 18.39v-1.5h7.177q1.566 0 2.694-1.033 1.13-1.034 1.13-2.553 0-1.52-1.13-2.548-1.128-1.029-2.694-1.029H7.266l2.783 2.783-1.054 1.054-4.587-4.587 4.587-4.586 1.054 1.053-2.783 2.783h7.021q2.194 0 3.759 1.465 1.564 1.464 1.564 3.612t-1.564 3.617q-1.564 1.47-3.759 1.47z" />
                    </SvgIcon>
                );
                });

                Undo.displayName = 'Undo';

                export default Undo;
            