
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type TagsProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const Tags = React.forwardRef<SVGSVGElement, TagsProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="m6.567 19.538 1-4H3.76l.375-1.5h3.807l1.02-4.077H5.154l.375-1.5h3.808l1-4h1.48l-1 4h4.135l1-4h1.48l-1 4h3.808l-.375 1.5h-3.807l-1.02 4.077h3.808l-.375 1.5h-3.807l-1 4h-1.481l1-4H9.048l-1 4zm2.856-5.5h4.135l1.019-4.077h-4.135z" />
                    </SvgIcon>
                );
                });

                Tags.displayName = 'Tags';

                export default Tags;
            