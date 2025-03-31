import ColorText from "@/assets/reactIcons/ColorText";
import ButtonColor from "@/components/button-color";
import React, { useEffect } from "react";

interface FormatTextColorProps {
  onSelect?: (color: string) => void;
  FormatTextColorInputRef: React.RefObject<HTMLInputElement>;
  textColor?: string;
}

// textColor

const FormatTextColor: React.FC<FormatTextColorProps> = ({ onSelect, FormatTextColorInputRef, textColor }) => {
  const handleClick = (): void => {
    FormatTextColorInputRef.current?.click();
  }

  useEffect(() => {
    console.log("🚀 ~ useEffect ~ textColor:", textColor)
    return () => {
    }
  }, [textColor])


  return (
    <ButtonColor
      onSelect={onSelect}
      initColor="black"
      icon={<ColorText
        color={textColor}
        size='small' />}
      handleClick={handleClick}
    />
  )
};

export default FormatTextColor;
