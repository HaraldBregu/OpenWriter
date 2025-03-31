
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type SuggestionProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const Suggestion = React.forwardRef<SVGSVGElement, SuggestionProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M17.55 8.75c-.36 0-.72.1-1.08.29a2.4 2.4 0 0 0-.8-.75c-.32-.18-.69-.28-1.11-.29-.36 0-.72.1-1.08.29a2.4 2.4 0 0 0-.8-.75c-.32-.18-.69-.28-1.11-.29-.24 0-.49.08-.7.18V4.3a2.3 2.3 0 0 0-4.6 0v7.73l-1.56 1.99a3.35 3.35 0 0 0 .14 4.26l1.78 2.02a5.25 5.25 0 0 0 3.98 1.79h3.96c2.92 0 5.3-2.38 5.3-5.3v-5.75a2.3 2.3 0 0 0-2.3-2.3zm-9.7 6.6V4.3c0-.39.31-.7.7-.7s.7.31.7.7v7.55h1.6v-2.3c0-.39.31-.7.7-.7s.7.31.7.7v2.3h1.6V10.3c0-.39.31-.7.7-.7s.7.31.7.7v1.55h1.6v-.8c0-.39.31-.7.7-.7s.7.31.7.7v5.75c0 2.04-1.66 3.7-3.7 3.7h-3.96c-.54 0-1.05-.11-1.52-.32-.48-.21-.9-.52-1.25-.93l-1.78-2.04c-.27-.3-.42-.69-.43-1.09-.02-.39.11-.78.36-1.1l.28-.37v.69h1.6z" />
                    </SvgIcon>
                );
                });

                Suggestion.displayName = 'Suggestion';

                export default Suggestion;
            