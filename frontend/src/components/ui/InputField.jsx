import React from "react";

const InputField = ({
  label,
  type,
  value,
  onChange,
  placeholder,
  required = true,
}) => {
  return (
    <div className="input-group">
      <label>{label}</label>
      <input
        type={type}
        className="rounded-input"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
      />
    </div>
  );
};

export default InputField;
