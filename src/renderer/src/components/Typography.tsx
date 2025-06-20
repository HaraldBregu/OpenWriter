import { cn } from "@/lib/utils";
import { ClassValue } from "clsx";

type TypographyProps = {
    children: React.ReactNode;
    className?: ClassValue | ClassValue[];
} & (
        {
            component: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div';
        } |
        {
            component: 'label';
            htmlFor?: string;
        }
    );

const Typogaphy = ({ component, children, className, ...props }: TypographyProps) => {
    const componentStyle = {
        h1: 'scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl',
        h2: 'scroll-m-20 pb-2 text-3xl font-semibold tracking-tight first:mt-0',
        h3: 'scroll-m-20 text-2xl font-semibold tracking-tight',
        h4: 'scroll-m-20 text-xl font-semibold tracking-tight',
        h5: 'scroll-m-20 text-lg font-semibold tracking-tight',
        h6: 'leading-7 font-bold',
        p: 'leading-7',
        span: 'leading-7',
        label: 'leading-7',
        div: 'leading-7',
    }
    const TagComponent = component;

    return (
        <TagComponent className={cn(componentStyle[component], className)} {...props}>{children}</TagComponent>
    );
}
export default Typogaphy;