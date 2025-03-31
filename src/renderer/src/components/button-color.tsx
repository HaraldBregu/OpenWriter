import { useState, ReactNode, FC, ChangeEvent } from "react";
import { Checkbox, FormControlLabel } from "@mui/material";
import { textFormatColors } from "@utils/optionsEnums";
import { useTranslation } from "react-i18next";
import cn from "@/utils/classNames";
import Button from "@components/ui/button";
import Typography from '@components/Typography';
import ButtonPopover from "./button-popover";

interface FormatTextColorProps {
    onSelect?: (color: string) => void;
    initColor: string;
    icon: ReactNode;
    handleClick: () => void;
}

const ButtonColor: FC<FormatTextColorProps> = ({ onSelect, initColor, icon, handleClick }) => {
    const { t } = useTranslation();
    const [curColor, setCurColor] = useState<string | undefined>(initColor);

    const popoverClass = cn('flex', 'flex-col', 'p-1', 'p-[16px]')
    const gridTemplateClass = cn('grid', 'grid-cols-8', 'gap-1', 'p-1', 'gap-[8px]')
    const differentColorClass = cn('flex', 'justify-around', 'items-center', 'p-1')
    const ctrlLabelClass = cn('pl-5', 'pb-5');
    const colorClass = (color: string): string => cn('border', 'rounded-1', 'aspect-square', { ['border-2 border-black']: curColor === color, ['border-gray-300']: curColor !== color })

    const handleClose = (): void => {
        onSelect?.(curColor || initColor);
    };

    return (
        <ButtonPopover
            btnFace={icon}
            closeHdlr={handleClose}
            clickHdlr={handleClick}
        >
            <>
                <div className={popoverClass}>
                    <div className={gridTemplateClass}>
                        {textFormatColors.map((color) => (
                            <Button
                                key={color}
                                variant="tonal"
                                size="iconSm"
                                className={colorClass(color)}
                                style={{ backgroundColor: color }}
                                onClick={() => setCurColor(color)}
                            />
                        ))}
                    </div>
                    <div className={differentColorClass}>
                        <Typography component="h6" className="font-normal">
                            {t('editor.color.differentColor')}
                        </Typography>

                        <input
                            type="color"
                            value={curColor || initColor}
                            onChange={({ target }: ChangeEvent<HTMLInputElement>) => {
                                setCurColor(target.value);
                            }}
                        />
                    </div>
                </div>

                <FormControlLabel
                    className={ctrlLabelClass}
                    control={
                        <Checkbox
                            checked={!curColor}
                            onChange={({ target }) => {
                                setCurColor(target.checked ? undefined : initColor);
                            }}
                            size="small"
                        />
                    }
                    label={t('editor.color.noColor')}
                />
            </>
        </ButtonPopover>
    );
};

export default ButtonColor;
