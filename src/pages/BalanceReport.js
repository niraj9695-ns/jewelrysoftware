import React from "react";
import "../assets/styles/forms.css";
import "../assets/styles/tables.css";
import "../assets/styles/dashboard.css";
// import "../assets/styles/main.css";

const BalanceReport = () => {
  return (
    <div className="view">
      <div className="section">
        <div className="section-header">
          <div>
            <h2>Balance Report</h2>
            <p>View balance reports for individual counters</p>
          </div>
        </div>
        <form>{/* Report filter inputs */}</form>
      </div>
    </div>
  );
};

export default BalanceReport;
