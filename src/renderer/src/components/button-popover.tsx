import { useState, MouseEvent, ReactNode, FC } from "react";
import { Popover } from "@mui/material";
import cn from "@/utils/classNames";
import Button from "@components/ui/button";

interface ButtonPopoverProps {
    btnFace: ReactNode;
    children: ReactNode;
    closeHdlr: () => void;
    clickHdlr: (e: MouseEvent<HTMLButtonElement>) => void;
}

const ButtonPopover: FC<ButtonPopoverProps> = ({ btnFace, children, closeHdlr: closeHdlr, clickHdlr }) => {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

    const handleClose = (): void => {
        setAnchorEl(null);
        closeHdlr()
    }

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
        <div>
            <Button
                onClick={handleClick}
                className={btnClass}
                variant="icon"
                size={"iconSm"}
                intent={"secondary"}
            >
                {btnFace}
            </Button>

            <Popover
                open={Boolean(anchorEl)}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
            >
                {children}
            </Popover>
        </div>
    );
};

export default ButtonPopover;
