import React, { useState, ReactNode } from 'react';
import { TextField, InputAdornment, IconButton, TextFieldProps, SxProps, Theme } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';

interface CriterionTextBoxProps extends Omit<TextFieldProps, 'error'> {
    id?: string;
    label?: string;
    value?: string | number;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    type?: string;
    placeholder?: string;
    fullWidth?: boolean;
    required?: boolean;
    disabled?: boolean;
    error?: string;
    helperText?: string;
    startAdornment?: ReactNode;
    endAdornment?: ReactNode;
    variant?: 'outlined' | 'filled' | 'standard';
    size?: 'small' | 'medium';
    sx?: SxProps<Theme>;
}

const CriterionTextBox: React.FC<CriterionTextBoxProps> = ({
    id,
    label,
    value,
    onChange,
    type = 'text',
    placeholder,
    fullWidth = true,
    required = false,
    disabled = false,
    error = '',
    helperText = '',
    startAdornment,
    endAdornment,
    variant = 'outlined',
    size = 'medium',
    sx = {},
    ...props
}) => {
    const [showPassword, setShowPassword] = useState(false);

    const handleClickShowPassword = () => {
        setShowPassword(!showPassword);
    };

    const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
    };

    const getInputType = () => {
        if (type !== 'password') return type;
        return showPassword ? 'text' : 'password';
    };

    const getPasswordAdornment = () => {
        if (type !== 'password') return endAdornment;

        return (
            <InputAdornment position="end">
                <IconButton
                    aria-label="toggle password visibility"
                    onClick={handleClickShowPassword}
                    onMouseDown={handleMouseDownPassword}
                    edge="end"
                    size="small"
                >
                    {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                </IconButton>
            </InputAdornment>
        );
    };

    const defaultStyles: SxProps<Theme> = {
        '& .MuiInputBase-input': {
            fontSize: '12px',
            height: '10px',
        },
        '& .MuiOutlinedInput-root': {
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: '#D3D3D3',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: '#D3D3D3',
            },
        },
        '& .MuiInputLabel-root.Mui-focused': {
            color: '#707070',
        },
        ...sx,
    };

    return (
        <TextField
            id={id}
            label={label}
            value={value}
            onChange={onChange}
            type={getInputType()}
            placeholder={placeholder}
            fullWidth={fullWidth}
            required={required}
            disabled={disabled}
            error={Boolean(error)}
            helperText={error || helperText}
            variant={variant}
            size={size}
            sx={defaultStyles}
            InputProps={{
                startAdornment: startAdornment && (
                    <InputAdornment position="start">{startAdornment}</InputAdornment>
                ),
                endAdornment: type === 'password'
                    ? getPasswordAdornment()
                    : endAdornment && (
                        <InputAdornment position="end">{endAdornment}</InputAdornment>
                    ),
            }}
            {...props}
        />
    );
};

export default CriterionTextBox;