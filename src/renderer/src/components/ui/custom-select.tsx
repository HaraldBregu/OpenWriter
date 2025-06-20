import React, { Fragment, memo } from "react";
import { cn } from "@/lib/utils";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectSeparator,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

export type SelectItemType = {
    value: string;
    label: string | React.ReactNode;
    style?: React.CSSProperties;
};

interface CustomSelectProps {
    value: string;
    onValueChange: (value: string) => void;
    items: SelectItemType[];
    disabled?: boolean;
    placeholder?: React.ReactNode;
    ariaLabel?: string;
    tabIndex?: number;
    triggerClassName?: string;
    itemClassName?: string;
    showSeparators?: boolean;
    minWidth?: string;
    tooltip?: string;
}

 const CustomSelectSeparator = memo(SelectSeparator)

const CustomSelect: React.FC<CustomSelectProps> = ({
    value,
    onValueChange,
    items,
    disabled = false,
    placeholder,
    ariaLabel,
    tabIndex,
    triggerClassName,
    itemClassName,
    showSeparators = false,
    minWidth = "100px",
    tooltip,
}) => {
    const defaultTriggerClassName = "pl-[4px] pr-[2px] hover:bg-primary hover:text-white active:bg-primary active:text-white focus-visible:bg-primary focus-visible:text-white py-0 h-auto border-none shadow-none focus:ring-0 focus:ring-offset-0";
    const defaultItemClassName = "hover:bg-primary hover:text-white active:bg-primary active:text-white focus-visible:bg-primary focus-visible:text-white";

    const selectTrigger = (
        <SelectTrigger
            aria-label={ariaLabel}
            tabIndex={tabIndex}
            className={cn(defaultTriggerClassName, triggerClassName)}
            style={{ minWidth }}
        >
            <SelectValue placeholder={placeholder} />
        </SelectTrigger>
    );

    return (
        <Select
            value={value}
            onValueChange={onValueChange}
            disabled={disabled}
        >
            {tooltip ? (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            {selectTrigger}
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{tooltip}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            ) : selectTrigger}
            <SelectContent>
                {items.map((item, index) => (
                    <Fragment key={`${item.value}-${index}`}>
                        {showSeparators && index > 0 && <CustomSelectSeparator className="text-xs font-normal" />}
                        <SelectItem
                            className={cn(defaultItemClassName, itemClassName)}
                            value={item.value}
                            style={item.style}
                            onClick={() => {
                                console.log("click item")
                            }}
                        >
                            {item.label}
                        </SelectItem>
                    </Fragment>
                ))}
            </SelectContent>
        </Select>
    );
};

export default CustomSelect;
