
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type ItalicProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const Italic = React.forwardRef<SVGSVGElement, ItalicProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M5.395 18.504v-1.808h3.817l3.24-9.634H8.635V5.254h9.154v1.808h-3.51l-3.24 9.634h3.51v1.808z" />
                    </SvgIcon>
                );
                });

                Italic.displayName = 'Italic';

                export default Italic;
            