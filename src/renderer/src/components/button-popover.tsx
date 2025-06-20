import { useState, MouseEvent, ReactNode, FC } from "react";
import cn from "@/utils/classNames";
import Button from "@components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

interface ButtonPopoverProps {
    btnFace: ReactNode;
    children: ReactNode;
    tooltip?: string;
    closeHdlr: () => void;
    clickHdlr: (e: MouseEvent<HTMLButtonElement>) => void;
}

const ButtonPopover: FC<ButtonPopoverProps> = ({ btnFace, children, closeHdlr: closeHdlr, clickHdlr, tooltip }) => {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

    const handleClick = (e: MouseEvent<HTMLButtonElement>): void => {
        setAnchorEl(e.currentTarget);
        clickHdlr(e)
    }

    const btnClass = cn(
        'flex',
        'flex-col',
        'items-center',
        'border-none',
        'bg-none',
        'cursor-pointer',
        'p-0',
        'leading-none'
    )

    return (
        <Popover
            open={Boolean(anchorEl)}
            onOpenChange={(open) => {
                if (!open) {
                    setAnchorEl(null);
                    closeHdlr()
                }
            }}>
            <PopoverTrigger asChild>
                <Button
                    onClick={handleClick}
                    className={btnClass}
                    tooltip={tooltip}
                    variant="icon"
                    size="iconSm"
                    intent="secondary"
                >
                    {btnFace}
                </Button>
            </PopoverTrigger>
            <PopoverContent>
                {children}
            </PopoverContent>
        </Popover>
    );
};

export default ButtonPopover;
