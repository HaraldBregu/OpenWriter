import { cn } from "@/lib/utils";
import DragIndicator from "./icons/DragIndicator";
import More from "./icons/More";
import Button from "./ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "./ui/dropdown-menu";

export type TextEditorNavBarOptions = {
    title?: string;
    icon?: React.ReactNode;
    onClick?: () => void;
    type: "ITEM" | "SEPARATOR";
    enabled?: boolean;
}

interface TextEditorNavBarProps {
    title: string;
    options?: TextEditorNavBarOptions[];
    className?: string;
    children?: React.ReactNode;
}

const TextEditorNavBar = ({
    title,
    options,
    className,
    children
}: TextEditorNavBarProps) => {
    return (
        <nav className={cn("h-8 px-2 flex items-center justify-between", className)}>
            <div className='cursor-pointer'>
                <DragIndicator intent='primary' variant='tonal' size='small' />
            </div>
            <span className="text-center text-xs font-medium">{title}</span>
            <div className="relative space-x-2">
                {options && options.length > 0 &&
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                intent="secondary"
                                variant="icon"
                                size="iconSm"
                                icon={<More intent='primary' variant='tonal' size='small' />}
                            />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {options.map((option) => {
                                if (option.type === "SEPARATOR") {
                                    return <DropdownMenuSeparator key={option.title + "separator"} />;
                                }
                                return (
                                    <DropdownMenuItem key={option.title + "item"} onClick={option.onClick} disabled={option.enabled === false}>
                                        {option.icon}
                                        {option.title}
                                    </DropdownMenuItem>
                                );
                            })}
                        </DropdownMenuContent>
                    </DropdownMenu>}
                {children}
            </div>
        </nav>
    )
}

export default TextEditorNavBar;