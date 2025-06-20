import { cn } from "@/lib/utils"
import { AnimatePresence, Reorder } from "framer-motion"

type ReorderGroupProps<T> = {
    children: React.ReactNode,
    items: T[],
    onReorder: (items: T[]) => void,
    className?: string
}

const ReorderGroup = <T,>({
    children,
    items,
    onReorder,
    className,
}: ReorderGroupProps<T>) => {
    return (
        <Reorder.Group
            as="ul"
            axis="y"
            onReorder={(newTabs) => onReorder(newTabs)}
            className={cn(
                "flex flex-col w-full",
                className
            )}
            values={items}
        >
            <AnimatePresence>
                {children}
            </AnimatePresence>
        </Reorder.Group>
    )
}

export default ReorderGroup