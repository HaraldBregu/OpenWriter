
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type ErrorProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const Error = React.forwardRef<SVGSVGElement, ErrorProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <g fillRule="evenodd" clipRule="evenodd"><path d="M22 7.9v8.3L16.1 22H7.9L2 16.2V7.9L7.9 2h8.2zM11.5 5.7v8.5h1.2V5.7zm1.1 12.6h-1.2v-1.8h1.2zM15.7 3 21 8.3v7.5L15.7 21H8.3L3 15.8V8.3L8.3 3z" /><path d="M7.796 1.75h8.408l6.046 6.046v8.509l-6.048 5.945H7.798L1.75 16.305V7.796zm.208.5L2.25 8.004v8.091l5.752 5.655h7.996l5.752-5.655V8.004L15.996 2.25zm.192.5h7.608l5.446 5.446v7.709l-5.448 5.345H8.198L2.75 15.905V8.196zm.208.5L3.25 8.404v7.291l5.152 5.055h7.196l5.152-5.055V8.404L15.596 3.25zm2.846 2.2h1.7v9h-1.7zm.5.5v8h.7v-8zm-.6 10.3h1.7v2.3h-1.7zm.5.5v1.3h.7v-1.3z" /></g>
                    </SvgIcon>
                );
                });

                Error.displayName = 'Error';

                export default Error;
            