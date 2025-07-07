import React from "react";
import { Store, Settings, Edit, BarChart3 } from "lucide-react";
import "../assets/styles/dashboard.css";
// import "../assets/styles/main.css";

const Navigation = ({ setView, currentView }) => {
  return (
    <div className="view">
      <div className="section">
        <div className="dashboard-navigation">
          <button
            className={`nav-btn ${currentView === "counters" ? "active" : ""}`}
            onClick={() => setView("counters")}
          >
            <Store /> Counters
          </button>
          <button
            className={`nav-btn ${currentView === "purities" ? "active" : ""}`}
            onClick={() => setView("purities")}
          >
            <Settings /> Gold Purities
          </button>
          <button
            className={`nav-btn ${
              currentView === "daily-entry" ? "active" : ""
            }`}
            onClick={() => setView("daily-entry")}
          >
            <Edit /> Daily Entry
          </button>
          <button
            className={`nav-btn ${
              currentView === "balance-report" ? "active" : ""
            }`}
            onClick={() => setView("balance-report")}
          >
            <BarChart3 /> Balance Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default Navigation;
