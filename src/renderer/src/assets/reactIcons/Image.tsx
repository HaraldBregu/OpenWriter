
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type ImageProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const Image = React.forwardRef<SVGSVGElement, ImageProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M5.308 20.5q-.758 0-1.283-.525a1.75 1.75 0 0 1-.525-1.283V5.308q0-.758.525-1.283T5.308 3.5h13.384q.758 0 1.283.525t.525 1.283v13.384q0 .758-.525 1.283t-1.283.525zm0-1.5h13.384a.3.3 0 0 0 .212-.096.3.3 0 0 0 .096-.212V5.308a.3.3 0 0 0-.096-.212.3.3 0 0 0-.212-.096H5.308a.3.3 0 0 0-.212.096.3.3 0 0 0-.096.212v13.384q0 .116.096.212a.3.3 0 0 0 .212.096m1.442-2.25h10.577l-3.289-4.384-2.807 3.653-2-2.557z" />
                    </SvgIcon>
                );
                });

                Image.displayName = 'Image';

                export default Image;
            