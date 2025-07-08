import React, { useEffect, useState } from "react";
import {
  LogOut,
  User,
  Store,
  Settings,
  DollarSign,
  Package,
} from "lucide-react";
import axios from "axios";
import "../assets/styles/dashboard.css";

const Header = ({ onLogout }) => {
  const [totalCounters, setTotalCounters] = useState(0);
  const [activePuritiesCount, setActivePuritiesCount] = useState(0);
  const [salesEntriesCount, setSalesEntriesCount] = useState(0);
  const [stockEntriesCount, setStockEntriesCount] = useState(0);

  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchTotalCounters();
    fetchActivePurities();
    fetchTotalSalesEntries();
    fetchTotalStockEntries();
  }, []);

  const fetchTotalCounters = async () => {
    try {
      const res = await axios.get("http://localhost:8080/api/counters", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTotalCounters(res.data.length);
    } catch (error) {
      console.error("Error fetching counters:", error);
    }
  };

  const fetchActivePurities = async () => {
    try {
      const res = await axios.get("http://localhost:8080/api/purities", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setActivePuritiesCount(res.data.length); // All purities are assumed active
    } catch (error) {
      console.error("Error fetching purities:", error);
    }
  };

  const fetchTotalSalesEntries = async () => {
    try {
      const res = await axios.get("http://localhost:8080/api/sales", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSalesEntriesCount(res.data.length);
    } catch (error) {
      console.error("Error fetching sales entries:", error);
    }
  };

  const fetchTotalStockEntries = async () => {
    try {
      const res = await axios.get("http://localhost:8080/api/issued-stock", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStockEntriesCount(res.data.length);
    } catch (error) {
      console.error("Error fetching stock entries:", error);
    }
  };

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
            <button className="btn btn-secondary" onClick={onLogout}>
              <LogOut />
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="view">
        <div className="section">
          <div className="dashboard-stats">
            <div className="stat-card blue">
              <div className="stat-icon">
                <Store />
              </div>
              <div className="stat-content">
                <h3>Total Counters</h3>
                <span className="stat-number">{totalCounters}</span>
              </div>
            </div>

            <div className="stat-card green">
              <div className="stat-icon">
                <Settings />
              </div>
              <div className="stat-content">
                <h3>Active Purities</h3>
                <span className="stat-number">{activePuritiesCount}</span>
              </div>
            </div>

            <div className="stat-card orange">
              <div className="stat-icon">
                <DollarSign />
              </div>
              <div className="stat-content">
                <h3>Total Sales Entries</h3>
                <span className="stat-number">{salesEntriesCount}</span>
              </div>
            </div>

            <div className="stat-card purple">
              <div className="stat-icon">
                <Package />
              </div>
              <div className="stat-content">
                <h3>Total Stock Entries</h3>
                <span className="stat-number">{stockEntriesCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Header;
