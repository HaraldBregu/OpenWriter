import { Typography } from "@mui/material";
import React, { useState } from "react";
import styles from '../../../index.module.css';

interface SpacingModalProps {
  initialLineSpacing: string;
  initialSpaceBefore: string;
  initialSpaceAfter: string;
  onApply: (lineSpacing: string, spaceBefore: string, spaceAfter: string) => void;
  onClose: () => void;
  onReset: () => void;
}

const SpacingModal: React.FC<SpacingModalProps> = ({
  initialLineSpacing,
  initialSpaceBefore,
  initialSpaceAfter,
  onApply,
  onClose,
  onReset,
}) => {
  const [lineSpacing, setLineSpacing] = useState(initialLineSpacing);
  const [spaceBefore, setSpaceBefore] = useState(initialSpaceBefore);
  const [spaceAfter, setSpaceAfter] = useState(initialSpaceAfter);

  const handleApply = () => {
    onApply(
      lineSpacing || "1",  // Default to single spacing if empty
      spaceBefore || "0",
      spaceAfter || "0"
    );
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '5px',
        width: '300px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      }}>
        <h3 style={{ marginTop: 0 }}>Paragraph Spacing</h3>

        <div style={{ marginBottom: '15px' }}>
          <Typography variant="subtitle2">Line Spacing (multiple):</Typography>
          <input
            type="number"
            value={lineSpacing}
            onChange={(e) => setLineSpacing(e.target.value)}
            min="0"
            step="0.1"
            className={styles["spacing-input"]}
            placeholder="1.0"
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <Typography variant="subtitle2">Space Before (pt):</Typography>
          <input
            type="number"
            value={spaceBefore}
            onChange={(e) => setSpaceBefore(e.target.value)}
            min="0"
            className={styles["spacing-input"]}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <Typography variant="subtitle2">Space After (pt):</Typography>
          <input
            type="number"
            value={spaceAfter}
            onChange={(e) => setSpaceAfter(e.target.value)}
            min="0"
            className={styles["spacing-input"]}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button onClick={onClose}>Cancel</button>
          <button onClick={() => { onReset(); onClose(); }}>Reset</button>
          <button onClick={handleApply} style={{ backgroundColor: '#007bff', color: 'black' }}>
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

export default SpacingModal;