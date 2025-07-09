import React, { useEffect, useState } from "react";
import axios from "axios";
import "../assets/styles/forms.css";

const SalesEntries = ({ counter, onBack }) => {
  const [entries, setEntries] = useState([]);
  const [purities, setPurities] = useState([]);
  const [columnTotals, setColumnTotals] = useState({});
  const [rangeType, setRangeType] = useState("range");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchPurities();
  }, []);

  useEffect(() => {
    if (counter && purities.length > 0) {
      fetchSales();
    }
  }, [counter, purities, rangeType, fromDate, toDate, selectedDate]);

  const fetchPurities = async () => {
    try {
      const res = await axios.get("http://localhost:8080/api/purities", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPurities(res.data);
    } catch (error) {
      console.error("Error fetching purities:", error);
    }
  };

  const fetchSales = async () => {
    try {
      const res = await axios.get("http://localhost:8080/api/sales", {
        headers: { Authorization: `Bearer ${token}` },
      });

      let filtered = res.data.filter((s) => s.counter.id === counter.id);

      if (rangeType === "range") {
        if (fromDate && toDate) {
          filtered = filtered.filter(
            (entry) => entry.date >= fromDate && entry.date <= toDate
          );
        }
      } else if (rangeType === "single" && selectedDate) {
        filtered = filtered.filter((entry) => entry.date === selectedDate);
      }

      const grouped = {};

      filtered.forEach((entry) => {
        const date = entry.date;
        const purity = entry.purity?.name;
        const weight = parseFloat(entry.soldWeight || 0);

        if (!grouped[date]) {
          grouped[date] = { date, total: 0 };
          purities.forEach((p) => {
            grouped[date][p.name] = 0;
          });
        }

        if (purity && grouped[date][purity] !== undefined) {
          grouped[date][purity] += weight;
        }

        grouped[date].total += weight;
      });

      const result = Object.values(grouped);

      // Column-wise totals
      const totals = { total: 0 };
      purities.forEach((p) => (totals[p.name] = 0));
      result.forEach((entry) => {
        purities.forEach((p) => {
          totals[p.name] += entry[p.name];
        });
        totals.total += entry.total;
      });

      setEntries(result);
      setColumnTotals(totals);
    } catch (error) {
      console.error("Error fetching sales entries:", error);
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

      <h2>Sales Summary for {counter?.name}</h2>

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
        <p>No sales entries found for selected date(s).</p>
      ) : (
        <table className="entries-table">
          <thead>
            <tr>
              <th>Date</th>
              {purities.map((p) => (
                <th key={p.id}>{p.name}</th>
              ))}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.date}>
                <td>{entry.date}</td>
                {purities.map((p) => (
                  <td key={p.id}>{entry[p.name]?.toFixed(2) || "0.00"}</td>
                ))}
                <td style={{ fontWeight: "bold" }}>{entry.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ fontWeight: "bold", backgroundColor: "#f9f9f9" }}>
              <td>Total</td>
              {purities.map((p) => (
                <td key={p.id}>
                  {(columnTotals[p.name] || 0).toFixed(2)}
                </td>
              ))}
              <td>{(columnTotals.total || 0).toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  );
};

export default SalesEntries;
