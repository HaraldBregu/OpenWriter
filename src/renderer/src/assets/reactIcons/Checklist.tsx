
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type ChecklistProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const Checklist = React.forwardRef<SVGSVGElement, ChecklistProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M5.694 18.452 2.5 15.257l1.044-1.044 2.125 2.125 4.25-4.25 1.044 1.07zm0-7.616L2.5 7.642l1.044-1.044L5.67 8.723l4.25-4.25 1.044 1.069zm7.315 5.721v-1.5h8.5v1.5zm0-7.615v-1.5h8.5v1.5z" />
                    </SvgIcon>
                );
                });

                Checklist.displayName = 'Checklist';

                export default Checklist;
            