import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import "../assets/styles/forms.css";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

import { FileDown, FileSpreadsheet, Pencil } from "lucide-react";

const SalesEntries = ({ counter, onBack }) => {
  const [entries, setEntries] = useState([]);
  const [purities, setPurities] = useState([]);
  const [columnTotals, setColumnTotals] = useState({});
  const [rangeType, setRangeType] = useState("range");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [editingRow, setEditingRow] = useState(null);
  const [editedValues, setEditedValues] = useState({});

  const editingRef = useRef(null);
  const token = localStorage.getItem("token");

  const fetchPurities = async () => {
    if (!counter?.material?.id) return;
    try {
      const res = await axios.get(
        `http://localhost:8080/api/purities/by-material/${counter.material.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setPurities(res.data);
    } catch (error) {
      console.error("Error fetching purities:", error);
    }
  };

  const fetchSales = async () => {
    if (!counter?.id || !counter?.material?.id) return;

    try {
      let url = "";

      if (rangeType === "range" && fromDate && toDate) {
        url = `http://localhost:8080/api/daily-sales/by-material-counter-daterange?materialId=${counter.material.id}&counterId=${counter.id}&startDate=${fromDate}&endDate=${toDate}`;
      } else if (rangeType === "single" && selectedDate) {
        url = `http://localhost:8080/api/daily-sales/by-material-counter-date?materialId=${counter.material.id}&counterId=${counter.id}&date=${selectedDate}`;
      } else {
        url = `http://localhost:8080/api/daily-sales/by-material-counter?materialId=${counter.material.id}&counterId=${counter.id}`;
      }

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = Array.isArray(res.data) ? res.data : [];

      const grouped = {};

      data.forEach((entry) => {
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

  useEffect(() => {
    fetchPurities();
  }, [counter]);

  useEffect(() => {
    if (counter && purities.length > 0) {
      fetchSales();
    }
  }, [counter, purities, rangeType, fromDate, toDate, selectedDate]);

  const handleEditClick = (entry) => {
    setEditingRow(entry.date);
    const values = {};
    purities.forEach((p) => {
      values[p.name] = entry[p.name]?.toFixed(2) || "0.00";
    });
    setEditedValues(values);
  };

  const handleSave = async (entry) => {
    try {
      const salesData = {};
      purities.forEach((p) => {
        salesData[p.name] = parseFloat(editedValues[p.name]) || 0;
      });

      const payload = {
        date: entry.date,
        counterId: counter.id,
        materialId: counter.material.id,
        salesData: salesData,
      };

      await axios.put("http://localhost:8080/api/daily-sales/update", payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      setEditingRow(null);
      fetchSales();
      alert("Sales updated successfully.");
    } catch (error) {
      console.error("Error updating sales:", error);
      alert("Failed to update sales.");
    }
  };

  // Close input boxes on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (editingRef.current && !editingRef.current.contains(event.target)) {
        setEditingRow(null);
      }
    };

    if (editingRow !== null) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [editingRow]);

  const downloadPDF = () => {
    const doc = new jsPDF();
    const tableColumn = ["Date", ...purities.map((p) => p.name), "Total"];
    const tableRows = [];

    entries.forEach((entry) => {
      const row = [
        entry.date,
        ...purities.map((p) => (entry[p.name] || 0).toFixed(2)),
        entry.total.toFixed(2),
      ];
      tableRows.push(row);
    });

    const totalsRow = [
      "Total",
      ...purities.map((p) => (columnTotals[p.name] || 0).toFixed(2)),
      (columnTotals.total || 0).toFixed(2),
    ];
    tableRows.push(totalsRow);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
    });

    doc.save(`Sales_Report_${counter.name}.pdf`);
  };

  const downloadExcel = () => {
    const wsData = [
      ["Date", ...purities.map((p) => p.name), "Total"],
      ...entries.map((entry) => [
        entry.date,
        ...purities.map((p) => (entry[p.name] || 0).toFixed(2)),
        entry.total.toFixed(2),
      ]),
      [
        "Total",
        ...purities.map((p) => (columnTotals[p.name] || 0).toFixed(2)),
        (columnTotals.total || 0).toFixed(2),
      ],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(wsData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "SalesData");

    XLSX.writeFile(workbook, `Sales_Report_${counter.name}.xlsx`);
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

      <div className="report-actions" style={{ marginBottom: "1.5rem" }}>
        <button className="btn btn-primary" onClick={downloadPDF}>
          <FileDown size={18} style={{ marginRight: "0.5rem" }} /> Download PDF
        </button>
        <button
          className="btn btn-secondary"
          onClick={downloadExcel}
          style={{ marginLeft: "1rem" }}
        >
          <FileSpreadsheet size={18} style={{ marginRight: "0.5rem" }} />{" "}
          Download Excel
        </button>
      </div>

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
              <th>Edit</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr
                key={entry.date}
                ref={editingRow === entry.date ? editingRef : null}
              >
                <td>{entry.date}</td>
                {purities.map((p) => (
                  <td key={p.id}>
                    {editingRow === entry.date ? (
                      <input
                        type="number"
                        step="0.01"
                        value={editedValues[p.name] || ""}
                        onChange={(e) =>
                          setEditedValues({
                            ...editedValues,
                            [p.name]: e.target.value,
                          })
                        }
                        style={{
                          backgroundColor: "#f1f1f1",
                          borderRadius: "5px",
                          padding: "4px",
                          border: "1px solid #ccc",
                          width: "70px",
                          textAlign: "right",
                        }}
                      />
                    ) : (
                      (entry[p.name] || 0).toFixed(2)
                    )}
                  </td>
                ))}
                <td style={{ fontWeight: "bold" }}>{entry.total.toFixed(2)}</td>
                <td>
                  {editingRow === entry.date ? (
                    <button
                      className="btn btn-success"
                      onClick={() => handleSave(entry)}
                    >
                      Save
                    </button>
                  ) : (
                    <button
                      className="btn btn-warning"
                      onClick={() => handleEditClick(entry)}
                    >
                      <Pencil size={16} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ fontWeight: "bold", backgroundColor: "#f9f9f9" }}>
              <td>Total</td>
              {purities.map((p) => (
                <td key={p.id}>{(columnTotals[p.name] || 0).toFixed(2)}</td>
              ))}
              <td>{(columnTotals.total || 0).toFixed(2)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  );
};

export default SalesEntries;
