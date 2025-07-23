import React, { createContext, useState, useContext } from "react";

// 1. Create the context
const MaterialContext = createContext();

// 2. Provider component
export const MaterialProvider = ({ children }) => {
  const [selectedMaterialId, setSelectedMaterialId] = useState(null);

  return (
    <MaterialContext.Provider
      value={{ selectedMaterialId, setSelectedMaterialId }}
    >
      {children}
    </MaterialContext.Provider>
  );
};

// 3. Custom hook for accessing the context
export const useMaterial = () => {
  const context = useContext(MaterialContext);
  if (!context) {
    throw new Error("useMaterial must be used within a MaterialProvider");
  }
  return context;
};
