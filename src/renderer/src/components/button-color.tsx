import { useState, ReactNode, FC, ChangeEvent } from "react";
import { textFormatColors } from "@utils/optionsEnums";
import { useTranslation } from "react-i18next";
import cn from "@/utils/classNames";
import Button from "@components/ui/button";
import Typography from '@components/Typography';
import ButtonPopover from "./button-popover";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";

interface FormatTextColorProps {
    onSelect?: (color: string) => void;
    initColor: string;
    icon: ReactNode;
    handleClick: () => void;
    tabIndex?: number;
    ariaLabel?: string;
    tooltip?: string;
}

const ButtonColor: FC<FormatTextColorProps> = ({ tabIndex = 0, ariaLabel = 'Text Color', onSelect, initColor, icon, handleClick, tooltip }) => {
    const { t } = useTranslation();
    const [curColor, setCurColor] = useState<string | undefined>(initColor);

    const popoverClass = cn('flex', 'flex-col', 'p-1')
    const gridTemplateClass = cn('grid', 'grid-cols-8', 'gap-1', 'p-1', 'gap-[8px]')
    const differentColorClass = cn('flex', 'justify-between', 'items-center', 'p-1')
    const colorClass = (color: string): string =>
        cn(
            'border rounded-1 aspect-square',
            {
                ['border-2 border-black']: curColor === color,
                ['border-gray-300']: curColor !== color
            }
        )

    const handleClose = (): void => {
        onSelect?.(curColor || initColor);
    };

    return (
        <ButtonPopover
            btnFace={icon}
            closeHdlr={handleClose}
            clickHdlr={handleClick}
            tooltip={tooltip}
        >
            <>
                <div className={popoverClass}>
                    <div className={gridTemplateClass}>
                        {textFormatColors.map((color) => (
                            <Button
                                key={color}
                                variant="tonal"
                                size="iconSm"
                                tabIndex={tabIndex}
                                aria-label={ariaLabel}
                                className={colorClass(color)}
                                style={{ backgroundColor: color }}
                                onClick={() => setCurColor(color)}
                            />
                        ))}
                    </div>
                    <div className={differentColorClass}>
                        <Typography
                            component="h6"
                            className="font-normal"
                        >
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
                <div className="flex items-start gap-3 p-1">
                    <Checkbox id="no-color-checkbox"
                        defaultChecked={!curColor}
                        checked={!curColor}
                        onCheckedChange={(value) => {
                            setCurColor(value ? undefined : initColor);
                        }} />
                    <div className="grid gap-2">
                        <Label htmlFor="no-color-checkbox">{t('editor.color.noColor')}</Label>
                    </div>
                </div>
            </>
        </ButtonPopover>
    );
};

export default ButtonColor;
