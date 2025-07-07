import React from "react";
import "../assets/styles/dashboard.css"; // Style for .stat-card and children
// import "../assets/styles/main.css";

const StatCard = ({ icon: Icon, title, value, color }) => {
  return (
    <div className="view">
      {" "}
      <div className="section">
        <div className={`stat-card ${color}`}>
          <div className="stat-icon">
            <Icon />
          </div>
          <div className="stat-content">
            <h3>{title}</h3>
            <span className="stat-number">{value}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatCard;
