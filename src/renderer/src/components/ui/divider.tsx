import { cn } from "@/lib/utils";

interface DividerProps {
    orientation?: 'vertical' | 'horizontal';
    className?: string;
}

export default function Divider({ orientation = 'vertical', className }: DividerProps) {
    return orientation === 'horizontal' ? (
        <div className={cn("w-full my-1 border-t border-grey-80 dark:border-grey-40", className)}></div>
    ) : (
        <div className={cn("self-center h-4 mx-1 px-1 border-l border-grey-80 dark:border-grey-40", className)}></div>
    );
}