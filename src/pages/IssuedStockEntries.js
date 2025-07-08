import React, { useEffect, useState } from "react";
import axios from "axios";

const IssuedStockEntries = ({ counter, onBack }) => {
  const [entries, setEntries] = useState([]);
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (counter) {
      fetchStockEntries();
    }
  }, [counter]);

  const fetchStockEntries = async () => {
    try {
      const res = await axios.get("http://localhost:8080/api/issued-stock", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const filtered = res.data.filter((s) => s.counter.id === counter.id);

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
            "23K": 0,
            "98/88": 0,
            "18K": 0,
            "92/99": 0,
          };
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

      {entries.length === 0 ? (
        <p>No stock issued entries found.</p>
      ) : (
        <table className="entries-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Bill No</th>
              <th>23K</th>
              <th>98/88</th>
              <th>18K</th>
              <th>92/99</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, idx) => (
              <tr key={idx}>
                <td>{entry.date}</td>
                <td>{entry.billNo}</td>
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

export default IssuedStockEntries;
