import React, { useEffect, useState } from "react";
import axios from "axios";
import "../assets/styles/dashboard.css";

const CounterSummary = ({ counter, onBack }) => {
  const [salesCount, setSalesCount] = useState(0);
  const [stockCount, setStockCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (counter?.id) {
      fetchCounts(counter.id);
    }
  }, [counter]);

  const fetchCounts = async (counterId) => {
    try {
      setLoading(true);

      const [salesRes, stockRes] = await Promise.all([
        axios.get(`http://localhost:8080/api/sales/by-counter/${counterId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`http://localhost:8080/api/issued-stock/by-counter/${counterId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setSalesCount(salesRes.data?.length || 0);
      setStockCount(stockRes.data?.length || 0);
    } catch (error) {
      console.error("Error loading counter summary:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!counter)
    return (
      <div className="view">
        <h3>No counter selected.</h3>
      </div>
    );

  return (
    <div className="view">
      <div className="section">
        <div className="section-header" style={{ display: "flex", justifyContent: "space-between" }}>
          <h2>Counter Summary: {counter.name}</h2>
          <button onClick={onBack} className="btn-clear">
            Back
          </button>
        </div>

        {loading ? (
          <p>Loading summary...</p>
        ) : (
          <div className="summary-box">
            <div className="summary-item">
              <strong>Sales Entries:</strong> {salesCount}
            </div>
            <div className="summary-item">
              <strong>Stock Issued Entries:</strong> {stockCount}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CounterSummary;
