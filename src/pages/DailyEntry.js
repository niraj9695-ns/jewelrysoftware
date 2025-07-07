import React from "react";
import "../assets/styles/forms.css";
import "../assets/styles/dashboard.css";
// import "../assets/styles/main.css";

const DailyEntry = () => {
  return (
    <div className="view">
      <div className="section">
        <div className="section-header">
          <div>
            <h2>Daily Entry</h2>
            <p>Record daily sales and stock entries for counters</p>
          </div>
        </div>
        <form>{/* Your Daily Entry Form */}</form>
      </div>
    </div>
  );
};

export default DailyEntry;
