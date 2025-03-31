
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type OuterMarginNoteProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const OuterMarginNote = React.forwardRef<SVGSVGElement, OuterMarginNoteProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <g><path d="M15.749 22h1.5V2h-1.5zM13.346 9.224v1.5H6.75v-1.5zM13.346 12.916v1.5H6.75v-1.5zM13.346 5.531v1.5H6.75v-1.5z" /></g>
                    </SvgIcon>
                );
                });

                OuterMarginNote.displayName = 'OuterMarginNote';

                export default OuterMarginNote;
            