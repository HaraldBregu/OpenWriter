
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type ArchiveProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const Archive = React.forwardRef<SVGSVGElement, ArchiveProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M5.308 21.5q-.748 0-1.278-.53a1.74 1.74 0 0 1-.53-1.278V8.494a1.9 1.9 0 0 1-.72-.645q-.28-.418-.28-.965V4.309q0-.748.53-1.278t1.278-.53h15.384q.749 0 1.278.53.53.53.53 1.278v2.577q0 .546-.28.964a1.9 1.9 0 0 1-.72.645v11.198q0 .749-.53 1.278-.53.53-1.278.53zM5 8.692v10.952a.33.33 0 0 0 .11.255.4.4 0 0 0 .275.101h13.307a.3.3 0 0 0 .221-.087.3.3 0 0 0 .087-.22v-11zm-.692-1.5h15.384a.3.3 0 0 0 .221-.086.3.3 0 0 0 .087-.221V4.308a.3.3 0 0 0-.087-.221.3.3 0 0 0-.22-.087H4.307a.3.3 0 0 0-.221.087.3.3 0 0 0-.087.22v2.577a.3.3 0 0 0 .087.222.3.3 0 0 0 .22.086m4.884 6.24h5.616V12H9.192z" />
                    </SvgIcon>
                );
                });

                Archive.displayName = 'Archive';

                export default Archive;
            