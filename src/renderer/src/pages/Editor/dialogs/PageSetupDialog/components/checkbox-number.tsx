import AppCheckbox from "@/components/app-checkbox";
import Typography from "@components/Typography"
import TextField from "@/components/ui/textField";

interface CheckboxNumberProps {
    id: string;
    label: string;
    labelBottom?: string;
    checked: boolean;
    disabled?: boolean;
    value: number;
    onChange: (value: object) => void
}

const CheckboxNumber = ({ 
    id, 
    label,
    labelBottom,
    checked, 
    disabled = false,
    value,
    onChange 
}: CheckboxNumberProps) => {
    return (
        <div className="flex flex-col gap-2">
            <AppCheckbox
                id={id}
                checked={checked}
                onCheckedChange={x => onChange({type: 'ELEMENT_EXISTS', element: id, payload: x})}
                label={label}
                labelClassName="text-[13px] font-bold"
                disabled={disabled}
            />
            <div className="flex flex-col items-start ml-[28px] w-fit">
                <TextField
                    id={`${id}-value`}
                    type="number"
                    disabled={!checked || disabled}
                    onChange={e => onChange({type: 'ELEMENT_VALUE', element: id, payload: parseFloat(e.target.value)})}
                    value={value}
                    min={0}
                    decimals={2}
                    unitMesure="cm"
                    className="max-w-[100px]"
                />
                {labelBottom && <Typography component="span" className="text-[13px] self-center">{labelBottom}</Typography>}
            </div>
        </div>
    );
};

export default CheckboxNumber;