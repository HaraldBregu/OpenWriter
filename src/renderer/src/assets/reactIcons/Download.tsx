
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type DownloadProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const Download = React.forwardRef<SVGSVGElement, DownloadProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="m12 15.789-4.27-4.27 1.055-1.084L11.25 12.9V4.5h1.5v8.4l2.465-2.465 1.054 1.084zM6.308 19.5q-.758 0-1.283-.525a1.75 1.75 0 0 1-.525-1.283v-2.711H6v2.711q0 .116.096.212a.3.3 0 0 0 .212.096h11.384a.3.3 0 0 0 .212-.096.3.3 0 0 0 .096-.212v-2.711h1.5v2.711q0 .758-.525 1.283t-1.283.525z" />
                    </SvgIcon>
                );
                });

                Download.displayName = 'Download';

                export default Download;
            