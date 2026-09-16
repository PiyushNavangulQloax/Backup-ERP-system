import React, { useState, useEffect, forwardRef } from 'react';

export interface NumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value?: number | string | null;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  ({ value, onChange, onFocus, onClick, onBlur, onKeyDown, type = 'number', ...props }, ref) => {
    const [focused, setFocused] = useState(false);
    const [displayVal, setDisplayVal] = useState<string>(
      value === undefined || value === null ? '' : String(value)
    );

    // Sync from parent value only when not focused, allowing uninterrupted typing
    useEffect(() => {
      if (!focused) {
        setDisplayVal(value === undefined || value === null ? '' : String(value));
      }
    }, [value, focused]);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setFocused(true);
      // Auto-select 0 so any subsequent key immediately replaces it
      if (e.target.value === '0') {
        e.target.select();
      }
      onFocus?.(e);
    };

    const handleClick = (e: React.MouseEvent<HTMLInputElement>) => {
      // Re-select if clicking into an input with 0
      if (e.currentTarget.value === '0') {
        e.currentTarget.select();
      }
      onClick?.(e);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // If the field currently holds just '0' and the user types a digit 1-9,
      // select '0' instantly so the keypress replaces it cleanly
      if (e.currentTarget.value === '0' && /^[1-9]$/.test(e.key)) {
        e.currentTarget.select();
      }
      onKeyDown?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let val = e.target.value;

      // If user typed a digit while 0 was present (e.g. "05" -> "5", "00" -> "0")
      // but retain decimals like "0.5" or "0."
      if (/^0+[0-9]/.test(val)) {
        val = val.replace(/^0+(?=\d)/, '');
        e.target.value = val;
      }

      setDisplayVal(val);
      onChange?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setFocused(false);
      // Sync back to parent's value representation on blur
      setDisplayVal(value === undefined || value === null ? '' : String(value));
      onBlur?.(e);
    };

    return (
      <input
        ref={ref}
        type={type}
        value={displayVal}
        onChange={handleChange}
        onFocus={handleFocus}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        {...props}
      />
    );
  }
);

NumberInput.displayName = 'NumberInput';
