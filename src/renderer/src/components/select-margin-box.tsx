import AppCheckbox from "@/components/app-checkbox";
import TextField from "@/components/ui/textField";
import { Dispatch, SetStateAction } from "react";
import Typography from "./Typography";

interface ISelectMrginBox {
    id: string
    label: string
    disabled?: boolean
    value: {
        checked: boolean;
        value: number;
    } 
    isCheckedVisible:boolean;
    checked?: boolean
    onChange: Dispatch<SetStateAction<{
        checked: boolean;
        value: number;
    }>>
    labelBottom?:string
}

const SelectMarginBox = ({
    id,
    label,
    disabled = false,
    value,
    onChange,
    isCheckedVisible,
    labelBottom
}: ISelectMrginBox) => {
    return (
        <div className="flex flex-col gap-2">
           { isCheckedVisible && <AppCheckbox
                id={id}
                checked={value.checked}
                onCheckedChange={x => onChange({ checked: x, value: value.value })}
                label={label}
                labelClassName="text-[13px] font-600"
                disabled={disabled}
            />}
            <div className="flex flex-col items-start w-full">
                <TextField
                    id={`${id}-value`}
                    type="number"
                    onChange={e => onChange({ checked: value.checked, value: parseFloat(e.target.value) })}
                    value={value.value}
                    min={0}
                    decimals={2}
                    unitMesure="cm"
                    className="max-w-[6rem]"
                />
            </div>
            {labelBottom && <Typography component="span" className="text-[13px] self-center">{labelBottom}</Typography>}

        </div>
    );
};

export default SelectMarginBox;