
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type SiglumProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const Siglum = React.forwardRef<SVGSVGElement, SiglumProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M5.898 19v-1.546h2.968v-.067c-1.88-1.298-2.968-3.464-2.968-5.984v-.019C5.898 7.615 8.437 5 12.197 5s6.299 2.615 6.299 6.384v.02c0 2.519-1.088 4.685-2.968 5.983v.067h2.968V19h-5.02v-1.842c2.223-1.48 3.264-3.264 3.264-5.716v-.02c0-2.958-1.728-4.838-4.543-4.838s-4.543 1.88-4.543 4.839v.019c0 2.452 1.04 4.237 3.264 5.716V19z" />
                    </SvgIcon>
                );
                });

                Siglum.displayName = 'Siglum';

                export default Siglum;
            