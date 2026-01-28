import React from "react";

const GradientButton = ({ text, onClick, type = "button" }) => {
  return (
    <button type={type} className="btn-gradient" onClick={onClick}>
      {text}
    </button>
  );
};

export default GradientButton;
