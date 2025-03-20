import React, { useState, MouseEvent, useCallback, useEffect } from "react";
import { Popover, Box, Button, Checkbox, FormControlLabel } from "@mui/material";
import { textFormatColors } from "../../../../../utils/optionsEnums";

interface FormatTextColorProps {
  onSelect?: (color: string) => void;
  FormatTextColorInputRef: React.RefObject<HTMLInputElement>;
  FormatTextColor: string;
}

const FormatTextColor: React.FC<FormatTextColorProps> = ({ onSelect, FormatTextColorInputRef, FormatTextColor }) => {
  const [selectedColor, setSelectedColor] = useState<string>("black"); // Default to first color
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [noColorChecked, setNoColorChecked] = useState(false);
  const [tempColor, setTempColor] = useState<string>(FormatTextColor || "black");

  useEffect(() => {
    setSelectedColor(FormatTextColor || "black");
    setTempColor(FormatTextColor || "black");
  }, [FormatTextColor]);

  const handleClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
    FormatTextColorInputRef.current?.click();
    setTempColor(selectedColor);
    setNoColorChecked(selectedColor === "none");
  }, [selectedColor, FormatTextColorInputRef]);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
    onSelect?.(tempColor);
  }, [onSelect, tempColor]);

  const handleColorSelect = useCallback((color: string) => {
    setTempColor(color);
    setNoColorChecked(color === "none");
  }, []);

  const getButtonStyle = useCallback(
    (color: string) => ({
      backgroundColor: color,
      width: 20,
      height: 20,
      minWidth: 20,
      borderRadius: "2px",
      border: tempColor === color ? "2px solid black" : "1px solid #ccc",
    }),
    [tempColor]
  );

  return (
    <div>
      <button onClick={handleClick} style={{ display: "flex", flexDirection: "column", alignItems: "center", border: "none", background: "none", cursor: "pointer", padding: "0", lineHeight: "1" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "black", marginBottom: "0px" }}>A</span>
        <div style={{ width: 15, height: 3, backgroundColor: selectedColor, border: "1px solid #ddd" }}></div>
      </button>

      <Popover open={Boolean(anchorEl)} anchorEl={anchorEl} onClose={handleClose} anchorOrigin={{ vertical: "bottom", horizontal: "left" }}>
        <Box p={1} display="flex" flexDirection="column">
          <Box display="grid" gridTemplateColumns="repeat(8, 1fr)" gap={1} p={1}>
            {textFormatColors.map((color) => (
              <Button key={color} style={getButtonStyle(color)} onClick={() => handleColorSelect(color)} />
            ))}
          </Box>
          <Box p={1} display="flex" justifyContent="space-around" alignItems="center">
            <h6>Choose a different color: </h6>
            <input
              type="color"
              value={tempColor === "none" ? "#000000" : tempColor}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const color = e.target.value;
                setTempColor(color);
                setNoColorChecked(false);
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
    </div>
  );
};

export default FormatTextColor;
