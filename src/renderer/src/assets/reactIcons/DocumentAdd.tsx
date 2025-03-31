
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type DocumentAddProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const DocumentAdd = React.forwardRef<SVGSVGElement, DocumentAddProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path fillRule="evenodd" d="M5.45 3.723a1.95 1.95 0 0 0-1.95 1.95v12.654a1.95 1.95 0 0 0 1.95 1.95h5.445v-1.5H5.45a.45.45 0 0 1-.45-.45V5.673a.45.45 0 0 1 .45-.45h10.773a.45.45 0 0 1 .45.45V12h1.5V5.673a1.95 1.95 0 0 0-1.95-1.95zm1.8 3.527h7.461v1.5H7.25zm0 3h7.461v1.5H7.25zm0 3h3.98v1.5H7.25zm9.5.5h1.5v3.5h3.5v1.5h-3.5v3.5h-1.5v-3.5h-3.5v-1.5h3.5z" clipRule="evenodd" />
                    </SvgIcon>
                );
                });

                DocumentAdd.displayName = 'DocumentAdd';

                export default DocumentAdd;
            