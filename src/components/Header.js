import React from "react";
import {
  LogOut,
  User,
  Store,
  Settings,
  DollarSign,
  Package,
} from "lucide-react";
import "../assets/styles/dashboard.css";

const Header = () => {
  return (
    <>
      <header className="app-header">
        <div className="header-content">
          <h1>Gold Jewelry Management</h1>
          <div className="header-actions">
            <span className="user-info">
              <User />
              <span>admin</span>
            </span>
            <button className="btn btn-secondary">
              <LogOut />
              Logout
            </button>
          </div>
        </div>
      </header>
      <div className="view">
        {" "}
        {/* ⬅️ This class applies padding & width */}
        <div className="section">
          {/* Stat Cards Section */}
          <div className="dashboard-stats">
            <div className="stat-card blue">
              <div className="stat-icon">
                <Store />
              </div>
              <div className="stat-content">
                <h3>Total Counters</h3>
                <span className="stat-number">0</span>
              </div>
            </div>

            <div className="stat-card green">
              <div className="stat-icon">
                <Settings />
              </div>
              <div className="stat-content">
                <h3>Active Purities</h3>
                <span className="stat-number">0</span>
              </div>
            </div>

            <div className="stat-card orange">
              <div className="stat-icon">
                <DollarSign />
              </div>
              <div className="stat-content">
                <h3>Sales Entries</h3>
                <span className="stat-number">0</span>
              </div>
            </div>

            <div className="stat-card purple">
              <div className="stat-icon">
                <Package />
              </div>
              <div className="stat-content">
                <h3>Stock Entries</h3>
                <span className="stat-number">0</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Header;
