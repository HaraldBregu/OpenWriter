
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type HomeProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const Home = React.forwardRef<SVGSVGElement, HomeProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M6 19h3.346v-5.943h5.308V19H18v-9l-6-4.52L6 10zm-1.5 1.5V9.25L12 3.605l7.5 5.645V20.5h-6.346v-5.943h-2.308V20.5z" />
                    </SvgIcon>
                );
                });

                Home.displayName = 'Home';

                export default Home;
            