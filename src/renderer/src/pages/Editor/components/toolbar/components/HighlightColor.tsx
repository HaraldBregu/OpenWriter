import React, { useState, MouseEvent, useCallback, useEffect } from "react";
import { Popover, Button, Box, Checkbox, FormControlLabel } from "@mui/material";
import { textFormatColors } from "@utils/optionsEnums";
import styles from '../../../index.module.css';
import cn from "@utils/classNames";

interface HighlightColorProps {
  onSelect?: (color: string) => void;
  highlightColorInputRef: React.RefObject<HTMLInputElement>;
  highlightColor: string;
}

const HighlightColor: React.FC<HighlightColorProps> = ({ onSelect, highlightColorInputRef, highlightColor }) => {
  const [selectedColor, setSelectedColor] = useState<string>(highlightColor || "none");
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [noColorChecked, setNoColorChecked] = useState(false);
  const [tempColor, setTempColor] = useState<string>(highlightColor || "none");

  useEffect(() => {
    setSelectedColor(highlightColor || "none");
    setTempColor(highlightColor || "none");
  }, [highlightColor]);

  useEffect(() => {
    setSelectedColor(highlightColor || "none");
  }, [highlightColor]);

  const handleClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
    highlightColorInputRef.current?.click();
    setTempColor(selectedColor);
    setNoColorChecked(false);
  }, [selectedColor, highlightColorInputRef]);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
    // Call onSelect only when closing the popover
    onSelect?.(tempColor);
  }, [onSelect, tempColor]);

  const handleColorSelect = useCallback((color: string) => {
    setTempColor(color); // 
    setNoColorChecked(color === "none");
  }, []);

  const getButtonStyle = useCallback(
    (color: string) => ({
      backgroundColor: color,
      width: 20,
      height: 20,
      minWidth: 20,
      borderRadius: "2px",
      border: tempColor === color ? "1px solid black" : "1px solid #C2C7CF",
    }),
    [tempColor]
  );

  return (
    <>
      <button
        onClick={handleClick}
        className={styles["hightlight-button"]}
        style={{ color: selectedColor || "inherit" }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "24px",
            paddingBottom: "6px",
          }}
        >
          <span
            className={cn(
              "material-symbols-outlined", styles["highlight-icon"])}
          >
            ink_highlighter
          </span>
          <div
            style={{
              width: 14,
              height: 3,
              backgroundColor: selectedColor || "#fff",
              borderWidth: "0.3px",
              borderStyle: "solid",
              borderColor: selectedColor || "#ddd",
            }}
          ></div>
        </div>
      </button>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Box p={1} display="flex" flexDirection="column">
          <Box
            display="grid"
            gridTemplateColumns="repeat(8, 1fr)"
            gap={1}
            p={1}
          >
            {textFormatColors.map((color) => (
              <Button
                key={color}
                style={getButtonStyle(color)}
                onClick={() => handleColorSelect(color)}
              />
            ))}
          </Box>
          <Box
            p={1}
            display="flex"
            justifyContent="space-around"
            alignItems="center"
          >
            <h6>Choose a different color: </h6>
            <input
              type="color"
              value={tempColor === "none" ? "#ffffff" : tempColor}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const color = e.target.value;
                setTempColor(color);
                setNoColorChecked(color === "none");
              }}
            />
          </Box>
        </Box>

        <FormControlLabel
          style={{ paddingLeft: 20, paddingBottom: 20 }}
          control={
            <Checkbox
              checked={noColorChecked}
              onChange={(e) => {
                const checked = e.target.checked;
                if (checked) {
                  setTempColor("none");
                  setNoColorChecked(true);
                }
              }}
              size="small"
            />
          }
          label="No Color"
        />
      </Popover>
    </>
  );
};

export default HighlightColor;
