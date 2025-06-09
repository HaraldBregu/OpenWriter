
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type ReadingSeperatorProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const ReadingSeperator = React.forwardRef<SVGSVGElement, ReadingSeperatorProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                        <path d="M12.2939 9.58789C11.0054 9.58789 10 8.58252 10 7.29395C10 6.01953 11.0054 5 12.2939 5C13.5684 5 14.5879 6.01953 14.5879 7.29395C14.5879 8.58252 13.5684 9.58789 12.2939 9.58789ZM12.2939 19.6699C11.0054 19.6699 10 18.6504 10 17.376C10 16.0874 11.0054 15.082 12.2939 15.082C13.5684 15.082 14.5879 16.0874 14.5879 17.376C14.5879 18.6504 13.5684 19.6699 12.2939 19.6699Z" fill={props.fillcolor ?? null} />
                    </SvgIcon>
                );
                });

                ReadingSeperator.displayName = 'ReadingSeperator';

                export default ReadingSeperator;
            