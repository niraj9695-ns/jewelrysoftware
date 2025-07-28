import React, { useEffect, useState } from "react";
import {
  LogOut,
  User,
  Store,
  Settings,
  DollarSign,
  Package,
  ChevronDown,
} from "lucide-react";
import axios from "axios";
import "../assets/styles/dashboard.css";
import { useMaterial } from "../components/MaterialContext"; // ✅ Context import

const Header = ({ onLogout }) => {
  const [totalCounters, setTotalCounters] = useState(0);
  const [activePuritiesCount, setActivePuritiesCount] = useState(0);
  const [salesEntriesCount, setSalesEntriesCount] = useState(0);
  const [stockEntriesCount, setStockEntriesCount] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedType, setSelectedType] = useState("Gold");

  const { selectedMaterialId, setSelectedMaterialId } = useMaterial(); // ✅ useContext
  const token = localStorage.getItem("token");

  const materialMap = {
    Gold: 1,
    Silver: 2,
    Diamond: 3,
  };

  // ✅ On first mount: set Gold as default if not selected
  useEffect(() => {
    if (!selectedMaterialId) {
      setSelectedMaterialId(materialMap["Gold"]);
      setSelectedType("Gold");
    }
  }, []);

  // ✅ When selectedMaterialId changes, fetch stats & sync dropdown label
  useEffect(() => {
    if (selectedMaterialId) {
      const foundType = Object.keys(materialMap).find(
        (key) => materialMap[key] === selectedMaterialId
      );
      if (foundType && foundType !== selectedType) {
        setSelectedType(foundType);
      }

      fetchTotalCounters(selectedMaterialId);
      fetchActivePurities(selectedMaterialId);
      fetchTotalSalesEntries(selectedMaterialId);
      fetchTotalStockEntries(selectedMaterialId);
    }
  }, [selectedMaterialId]);

  const fetchTotalCounters = async (materialId) => {
    try {
      const res = await axios.get(
        `http://localhost:8080/api/counters/by-material/${materialId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setTotalCounters(res.data.length);
    } catch (error) {
      console.error("Error fetching counters:", error);
    }
  };

  const fetchActivePurities = async (materialId) => {
    try {
      const res = await axios.get(
        `http://localhost:8080/api/purities/by-material/${materialId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setActivePuritiesCount(res.data.length);
    } catch (error) {
      console.error("Error fetching purities:", error);
    }
  };

  const fetchTotalSalesEntries = async (materialId) => {
    try {
      const res = await axios.get(
        `http://localhost:8080/api/daily-sales/by-material?materialId=${materialId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSalesEntriesCount(res.data.length);
    } catch (error) {
      console.error("Error fetching sales entries:", error);
    }
  };

  const fetchTotalStockEntries = async (materialId) => {
    try {
      const res = await axios.get(
        `http://localhost:8080/api/issued-stock/by-material?materialId=${materialId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setStockEntriesCount(res.data.length);
    } catch (error) {
      console.error("Error fetching stock entries:", error);
    }
  };

  const toggleDropdown = () => {
    setIsDropdownOpen((prev) => !prev);
  };

  const handleTypeChange = (type) => {
    setSelectedType(type);
    setSelectedMaterialId(materialMap[type]);
    setIsDropdownOpen(false);
  };

  return (
    <>
      <header className="app-header">
        <div className="header-content">
          <div className="header-left">
            <h1>{selectedType} Jewelry Management</h1>

            <div className="jewelry-type-switcher">
              <span className="jewelry-label">Type:</span>
              <div className="jewelry-dropdown">
                <button
                  className="jewelry-dropdown-btn"
                  onClick={toggleDropdown}
                >
                  <span>{selectedType}</span>
                  <ChevronDown className="jewelry-dropdown-icon" />
                </button>
                {isDropdownOpen && (
                  <div className="jewelry-dropdown-menu">
                    {Object.keys(materialMap).map((type) => (
                      <button
                        key={type}
                        className={`jewelry-dropdown-item ${type.toLowerCase()}`}
                        onClick={() => handleTypeChange(type)}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

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
