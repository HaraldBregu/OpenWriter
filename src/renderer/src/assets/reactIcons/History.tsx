
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type HistoryProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const History = React.forwardRef<SVGSVGElement, HistoryProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M11.981 20.5q-3.248 0-5.661-2.139Q3.906 16.224 3.54 13h1.53q.379 2.59 2.333 4.295Q9.356 19 11.98 19q2.925 0 4.963-2.038Q18.98 14.926 18.98 12t-2.037-4.962T11.98 5a6.7 6.7 0 0 0-3.07.728 7.6 7.6 0 0 0-2.468 2.003h2.615v1.5H3.981V4.154h1.5v2.369a8.5 8.5 0 0 1 2.916-2.23A8.4 8.4 0 0 1 11.98 3.5q1.77 0 3.316.67a8.6 8.6 0 0 1 2.696 1.819 8.6 8.6 0 0 1 1.819 2.696q.67 1.545.67 3.315t-.67 3.315a8.6 8.6 0 0 1-1.82 2.697 8.6 8.6 0 0 1-2.695 1.819 8.3 8.3 0 0 1-3.316.669m3.002-4.473-3.723-3.723V7h1.5v4.696l3.277 3.277z" />
                    </SvgIcon>
                );
                });

                History.displayName = 'History';

                export default History;
            