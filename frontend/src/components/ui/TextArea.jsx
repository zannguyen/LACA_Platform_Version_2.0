// src/components/ui/TextArea.jsx
import React from "react";

const TextArea = ({
  placeholder,
  value,
  onChange,
  rows = 10,
  className = "",
  disabled = false,
  maxLength,
  ...rest
}) => {
  return (
    <div className="input-group">
      <textarea
        className={`rounded-textarea ${className}`}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        rows={rows}
        disabled={disabled}
        maxLength={maxLength}
        {...rest}
      />
    </div>
  );
};

export default TextArea;
