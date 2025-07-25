import React, { useState } from "react";
import {
  Store,
  Settings,
  Edit,
  BarChart3,
  ChevronDown,
  TrendingUp,
  Package,
  Boxes,
  ClipboardList,
} from "lucide-react";
import "../assets/styles/dashboard.css";
import { useMaterial } from "./MaterialContext"; 

const Navigation = ({ setView, currentView }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { selectedMaterialId } = useMaterial(); //

  const toggleDropdown = () => setIsDropdownOpen(!isDropdownOpen);

  // ID to Name mapping
  const materialNames = {
    1: "Gold",
    2: "Silver",
    3: "Diamond",
  };

  const materialLabel = materialNames[selectedMaterialId] || "";

  return (
    <div className="view">
      <div className="section">
        <div className="dashboard-navigation">
          {/* Counters */}
          <button
            className={`nav-btn ${currentView === "counters" ? "active" : ""}`}
            onClick={() => setView("counters")}
          >
            <Store />
            <span>Counters</span>
          </button>

          {/* Dynamic Material Purities */}
          <button
            className={`nav-btn ${currentView === "purities" ? "active" : ""}`}
            onClick={() => setView("purities")}
          >
            <Settings />
            <span id="purityNavText">{materialLabel} Purities</span>
          </button>

          {/* Daily Entry with Dropdown */}
          <div className="nav-dropdown">
            <button
              className={`nav-btn dropdown-btn ${
                currentView === "daily-entry" ||
                currentView === "daily-sales-dashboard" ||
                currentView === "stock-issue-entry" ||
                currentView === "issued-stock-dashboard"
                  ? "active"
                  : ""
              }`}
              onClick={toggleDropdown}
            >
              <Edit />
              <span>Daily Entry</span>
              <ChevronDown className="dropdown-icon" />
            </button>

            {isDropdownOpen && (
              <div className="dropdown-menu">
                <button
                  className={`dropdown-item ${
                    currentView === "daily-sales-dashboard" ? "active" : ""
                  }`}
                  onClick={() => setView("daily-sales-dashboard")}
                >
                  <TrendingUp />
                  <span>Daily Sales Entries</span>
                </button>
                <button
                  className={`dropdown-item ${
                    currentView === "stock-issue-entry" ? "active" : ""
                  }`}
                  onClick={() => setView("stock-issue-entry")}
                >
                  <Package />
                  <span>Stock Issue Entry</span>
                </button>
                <button
                  className={`dropdown-item ${
                    currentView === "issued-stock-dashboard" ? "active" : ""
                  }`}
                  onClick={() => setView("issued-stock-dashboard")}
                >
                  <ClipboardList />
                  <span>Stock Issue Bulk Entry</span>
                </button>
              </div>
            )}
          </div>

          {/* Balance Report */}
          <button
            className={`nav-btn ${
              currentView === "balance-report" ? "active" : ""
            }`}
            onClick={() => setView("balance-report")}
          >
            <BarChart3 />
            <span>Balance Report</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Navigation;
