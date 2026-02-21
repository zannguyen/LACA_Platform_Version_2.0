import React from "react";

const GradientButton = ({ text, onClick, type = "button", disabled = false }) => {
  return (
    <button
      type={type}
      className="btn-gradient"
      onClick={onClick}
      disabled={disabled}
    >
      {text}
    </button>
  );
};

export default GradientButton;
