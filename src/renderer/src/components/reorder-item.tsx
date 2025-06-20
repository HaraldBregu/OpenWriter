import cn from "@/utils/classNames";
import { PanInfo, Reorder } from "framer-motion";

type ReorderItemProps<T> = {
    id: string,
    item: T,
    children: React.ReactNode,
    className?: string,
    drag: "y" | "x" | undefined | boolean,
    onDragEnd?(event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo): void;
}

const ReorderItem = <T,>({
    id,
    item,
    children,
    className,
    drag,
    onDragEnd,
}: ReorderItemProps<T>) => {
    return (
        <Reorder.Item
            id={id}
            value={item}
            initial={{
                opacity: 1,
                x: 0
            }}
            animate={{
                opacity: 1,
                x: 0,
                transition: {
                    duration: 0.1,
                    ease: 'easeInOut'
                }
            }}
            exit={{
                opacity: 0,
                x: 20,
                transition: {
                    duration: 0.15
                }
            }}
            whileDrag={{
                transition: {
                    ease: 'easeInOut'
                }
            }}
            drag={drag}
            onDragEnd={onDragEnd}
            className={cn(className, "bg-grey-95 dark:bg-grey-20")}>
            {children}
        </Reorder.Item>
    )
}

export default ReorderItem