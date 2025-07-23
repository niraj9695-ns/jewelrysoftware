// MaterialSelector.js
import React from "react";
import { useMaterial } from "../context/MaterialContext";

const MaterialSelector = () => {
  const { setSelectedMaterialId } = useMaterial();

  const handleChange = (e) => {
    setSelectedMaterialId(e.target.value); // e.g., "1"
  };

  return (
    <select onChange={handleChange}>
      <option value="">Select Material</option>
      <option value="1">Gold</option>
      <option value="2">Silver</option>
      <option value="3">Platinum</option>
    </select>
  );
};

export default MaterialSelector;
