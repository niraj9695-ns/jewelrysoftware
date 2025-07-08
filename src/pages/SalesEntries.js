import React, { useEffect, useState } from "react";
import axios from "axios";

const SalesEntries = ({ counter, onBack }) => {
  const [entries, setEntries] = useState([]);
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (counter) {
      fetchSales();
    }
  }, [counter]);

  const fetchSales = async () => {
    try {
      const res = await axios.get("http://localhost:8080/api/sales", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const filtered = res.data.filter((s) => s.counter.id === counter.id);

      const grouped = {};

      filtered.forEach((entry) => {
        const date = entry.date;
        const purity = entry.purity?.name;
        const weight = parseFloat(entry.soldWeight || 0);

        if (!grouped[date]) {
          grouped[date] = {
            date,
            total: 0,
            "23K": 0,
            "98/88": 0,
            "18K": 0,
            "92/99": 0,
          };
        }

        if (purity && grouped[date][purity] !== undefined) {
          grouped[date][purity] += weight;
        }

        grouped[date].total += weight;
      });

      setEntries(Object.values(grouped));
    } catch (error) {
      console.error("Error fetching sales entries:", error);
    }
  };

  return (
    <div className="view">
      <button onClick={onBack} className="btn btn-secondary" style={{ marginBottom: "1rem" }}>
        ← Back to Counters
      </button>
      <h2>Sales Summary for {counter?.name}</h2>

      {entries.length === 0 ? (
        <p>No sales entries found.</p>
      ) : (
        <table className="entries-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>23K</th>
              <th>98/88</th>
              <th>18K</th>
              <th>92/99</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.date}>
                <td>{entry.date}</td>
                <td>{entry["23K"].toFixed(2)}</td>
                <td>{entry["98/88"].toFixed(2)}</td>
                <td>{entry["18K"].toFixed(2)}</td>
                <td>{entry["92/99"].toFixed(2)}</td>
                <td style={{ fontWeight: "bold" }}>{entry.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default SalesEntries;
