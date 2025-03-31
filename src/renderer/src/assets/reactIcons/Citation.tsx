
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type CitationProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const Citation = React.forwardRef<SVGSVGElement, CitationProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <g fillRule="evenodd" clipRule="evenodd"><path d="M13 6.25h6.5v5.5h-5.478a5.5 5.5 0 0 0 5.478 5v1a6.5 6.5 0 0 1-6.5-6.5zm-8.5 0H11v5.5H5.522a5.5 5.5 0 0 0 5.478 5v1a6.5 6.5 0 0 1-6.5-6.5z" /><path d="M19.75 6h-7v5.25A6.75 6.75 0 0 0 19.5 18h.25v-1.5h-.25a5.25 5.25 0 0 1-5.197-4.5h5.447zm-.5.5v5h-5.501l.024.272a5.75 5.75 0 0 0 5.477 5.223v.5a6.25 6.25 0 0 1-6-6.245V6.5zm-8-.5h-7v5.25A6.75 6.75 0 0 0 11 18h.25v-1.5H11A5.25 5.25 0 0 1 5.803 12h5.447zm-.5.5v5H5.249l.024.272a5.75 5.75 0 0 0 5.477 5.223v.5a6.25 6.25 0 0 1-6-6.245V6.5z" /></g>
                    </SvgIcon>
                );
                });

                Citation.displayName = 'Citation';

                export default Citation;
            