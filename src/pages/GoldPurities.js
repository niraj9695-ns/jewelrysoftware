import React from "react";
import "../assets/styles/dashboard.css";
import "../assets/styles/forms.css";
// import "../assets/styles/main.css";

const GoldPurities = () => {
  return (
    <div className="view">
      <div className="section">
        <div className="section-header">
          <div>
            <h2>Gold Purities</h2>
            <p>Manage gold purity types for all counters</p>
          </div>
          <button className="btn btn-success">
            <i data-lucide="plus"></i> Add Purity
          </button>
        </div>
        <div className="purities-grid">
          {/* Purities will be populated here */}
        </div>
      </div>
    </div>
  );
};

export default GoldPurities;
