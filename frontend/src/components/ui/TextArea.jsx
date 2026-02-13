import React from "react";

const TextArea = ({ placeholder, value, onChange, rows = 10 }) => {
  return (
    <div className="input-group">
      <textarea
        className="rounded-textarea"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        rows={rows}
      ></textarea>
    </div>
  );
};

export default TextArea;
