import ButtonColor from "@/components/button-color";
import React, { useEffect } from "react";
import ColorTextSplitted from "./icons/ColorText";

interface FormatTextColorProps {
  onSelect?: (color: string) => void;
  FormatTextColorInputRef?: React.RefObject<HTMLInputElement>;
  textColor?: string;
  tabIndex?: number;
  ariaLabel?: string;
  tooltip?: string;
}

const FormatTextColor: React.FC<FormatTextColorProps> = ({ onSelect, FormatTextColorInputRef, textColor, tabIndex = 0, ariaLabel = 'Text Color', tooltip }) => {
  const handleClick = (): void => {
    FormatTextColorInputRef?.current?.click();
  }

  useEffect(() => {
    return () => {
    }
  }, [textColor])


  return (
    <ButtonColor
      onSelect={onSelect}
      initColor="black"
      tooltip={tooltip}
      ariaLabel={ariaLabel}
      tabIndex={tabIndex}
      icon={
        <ColorTextSplitted
          className="[&>path:first-child]:fill-current"
          style={{ color: textColor }}
          size='small'
        />
      }
      handleClick={handleClick}
    />
  )
};

export default FormatTextColor;
