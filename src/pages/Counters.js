import React from "react";
import "../assets/styles/dashboard.css";
import "../assets/styles/forms.css";
import "../assets/styles/main.css";

const Counters = () => {
  return (
    <div className="view">
      {" "}
      <div className="section">
        <div className="section-header">
          <div>
            <h2>Counter List</h2>
            <p>0/8 counters created</p>
          </div>
          <button className="btn btn-success">
            <i data-lucide="plus"></i> Add Counter
          </button>
        </div>
        <div className="counters-grid">
          {/* Counters will be populated here */}
        </div>
      </div>
    </div>
  );
};

export default Counters;
