import React from "react";
import styles from '../../../index.module.css';
import cn from "@utils/classNames";
import ButtonColor from "@/components/button-color";
import Highlighter from "@/assets/reactIcons/Highlighter";

interface HighlightColorProps {
  onSelect?: (color: string) => void;
  highlightColorInputRef: React.RefObject<HTMLInputElement>;
  highlightColor: string;
}
// highlightColor
const HighlightColor: React.FC<HighlightColorProps> = ({ onSelect, highlightColorInputRef, highlightColor }) => {
  const handleClick = (): void => {
    highlightColorInputRef.current?.click();
  };

  return (
    <ButtonColor
      onSelect={onSelect}
      initColor="white"
      icon={<Highlighter
        color={highlightColor}
        size='small' />}
      handleClick={handleClick}
    />
  )
}

export default HighlightColor;
