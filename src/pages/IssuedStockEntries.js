import React, { useEffect, useState } from "react";
import axios from "axios";
import "../assets/styles/forms.css"; 

const IssuedStockEntries = ({ counter, onBack }) => {
  const [entries, setEntries] = useState([]);
  const [purities, setPurities] = useState([]);

  const [rangeType, setRangeType] = useState("range");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchPurities();
  }, []);

  useEffect(() => {
    if (counter && purities.length) {
      fetchStockEntries();
    }
  }, [counter, purities, rangeType, fromDate, toDate, selectedDate]);

  const fetchPurities = async () => {
    try {
      const res = await axios.get("http://localhost:8080/api/purities", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPurities(res.data);
    } catch (err) {
      console.error("Error fetching purities:", err);
    }
  };

  const fetchStockEntries = async () => {
    try {
      const res = await axios.get("http://localhost:8080/api/issued-stock", {
        headers: { Authorization: `Bearer ${token}` },
      });

      let filtered = res.data.filter((s) => s.counter.id === counter.id);

      // Filter by date
      if (rangeType === "range" && fromDate && toDate) {
        filtered = filtered.filter(
          (entry) => entry.date >= fromDate && entry.date <= toDate
        );
      } else if (rangeType === "single" && selectedDate) {
        filtered = filtered.filter((entry) => entry.date === selectedDate);
      }

      const grouped = {};

      filtered.forEach((entry) => {
        const date = entry.date;
        const billNo = entry.billNo || "-";
        const purity = entry.purity?.name;
        const weight = parseFloat(entry.issuedWeight || 0);
        const key = `${date}__${billNo}`;

        if (!grouped[key]) {
          grouped[key] = {
            date,
            billNo,
            total: 0,
          };
          purities.forEach((p) => {
            grouped[key][p.name] = 0;
          });
        }

        if (purity && grouped[key][purity] !== undefined) {
          grouped[key][purity] += weight;
        }

        grouped[key].total += weight;
      });

      setEntries(Object.values(grouped));
    } catch (error) {
      console.error("Error fetching issued stock entries:", error);
    }
  };

  return (
    <div className="view">
      <button
        onClick={onBack}
        className="btn btn-secondary"
        style={{ marginBottom: "1rem" }}
      >
        ← Back to Counters
      </button>

      <h2>Issued Stock Summary for {counter?.name}</h2>

      <div className="form-row" style={{ marginBottom: "1.5rem" }}>
        <div className="form-group">
          <label htmlFor="rangeType">Date Filter</label>
          <select
            id="rangeType"
            className="form-select"
            value={rangeType}
            onChange={(e) => setRangeType(e.target.value)}
          >
            <option value="range">Date Range</option>
            <option value="single">Single Date</option>
          </select>
        </div>

        {rangeType === "range" && (
          <>
            <div className="form-group">
              <label htmlFor="fromDate">From Date</label>
              <input
                id="fromDate"
                type="date"
                className="form-input"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="toDate">To Date</label>
              <input
                id="toDate"
                type="date"
                className="form-input"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </>
        )}

        {rangeType === "single" && (
          <div className="form-group">
            <label htmlFor="selectedDate">Date</label>
            <input
              id="selectedDate"
              type="date"
              className="form-input"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        )}
      </div>

      {entries.length === 0 ? (
        <p>No stock issued entries found.</p>
      ) : (
        <table className="entries-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Bill No</th>
              {purities.map((p) => (
                <th key={p.id}>{p.name}</th>
              ))}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, idx) => (
              <tr key={idx}>
                <td>{entry.date}</td>
                <td>{entry.billNo}</td>
                {purities.map((p) => (
                  <td key={p.id}>{entry[p.name]?.toFixed(2) || "0.00"}</td>
                ))}
                <td style={{ fontWeight: "bold" }}>
                  {entry.total.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default IssuedStockEntries;
