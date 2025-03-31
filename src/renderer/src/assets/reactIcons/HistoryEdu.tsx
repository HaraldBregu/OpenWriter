
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type HistoryEduProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const HistoryEdu = React.forwardRef<SVGSVGElement, HistoryEduProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M8.058 21q-.697 0-1.193-.504a1.67 1.67 0 0 1-.496-1.214V16.42h3.247v-3.15a5 5 0 0 1-2.034-.256 4.3 4.3 0 0 1-1.737-1.104v-1.436H4.4L1 7.017a5.76 5.76 0 0 1 2.353-1.602 8.1 8.1 0 0 1 2.774-.495q.92 0 1.79.214t1.7.705V4H22v14.137q0 1.2-.817 2.032a2.7 2.7 0 0 1-1.997.831zm3.247-4.58h6.755v1.717a1.12 1.12 0 0 0 1.126 1.145q.478 0 .802-.329.323-.33.323-.816V5.717h-9.006v1.26l6.473 6.585v1.206h-1.186l-3.317-3.373-.43.438a6 6 0 0 1-.739.638q-.377.27-.8.443zM5.118 8.756h2.416v2.352q.456.296.887.403.432.108.862.108.708 0 1.283-.233.574-.234 1.103-.77l.42-.428-1.771-1.801A5.7 5.7 0 0 0 8.39 7.075a5.9 5.9 0 0 0-2.264-.437q-.693 0-1.335.152a6.3 6.3 0 0 0-1.203.412zm11.253 9.381H8.058v1.145h8.569a1.8 1.8 0 0 1-.197-.536 3 3 0 0 1-.059-.609" />
                    </SvgIcon>
                );
                });

                HistoryEdu.displayName = 'HistoryEdu';

                export default HistoryEdu;
            