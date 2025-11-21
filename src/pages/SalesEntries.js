// SalesEntries.js (UPDATED: smart number formatting - keeps .00 but shows full precision when >2 decimals)

import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import "../assets/styles/forms.css";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

import { FileDown, FileSpreadsheet, Pencil, Trash2 } from "lucide-react";

import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { TextField } from "@mui/material";
import { format } from "date-fns";

const SalesEntries = ({ counter, onBack }) => {
  const [entries, setEntries] = useState([]);
  const [purities, setPurities] = useState([]);
  const [columnTotals, setColumnTotals] = useState({});
  const [rangeType, setRangeType] = useState("range");
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [editingRow, setEditingRow] = useState(null);
  const [editedValues, setEditedValues] = useState({});

  const editingRef = useRef(null);
  const token = localStorage.getItem("token");

  const formatDate = (dateObj) =>
    dateObj ? format(dateObj, "yyyy-MM-dd") : "";

  // ---------- Helper: display formatting ----------
  const formatNumberDisplay = (value) => {
    // handle null/undefined
    if (value === null || value === undefined) return "0.00";

    // if it's a string (maybe from input), try to parse
    let num = typeof value === "string" ? Number(value) : value;
    if (isNaN(num)) return value; // fallback, show raw value

    // Use string representation to check decimals that user provided
    // We prefer to use a stable string representation:
    const asString = String(num);

    // If asString has scientific notation, convert via toPrecision then trim trailing zeros
    // But in typical ranges this won't be necessary.

    if (!asString.includes(".")) {
      // integer -> show 2 decimals
      return num.toFixed(2);
    }

    const parts = asString.split(".");
    const decimals = parts[1] || "";

    if (decimals.length <= 2) {
      // show exactly two decimals (preserve .00 or .10 etc)
      return num.toFixed(2);
    }

    // decimals length > 2 -> show full precision (but trim trailing zeros if any)
    // Using Number(...) then toString() removes any unnecessary trailing zeros produced by float arithmetic
    // but preserves the input precision if present.
    const trimmed = Number(num).toString();

    // In some cases Number(num).toString() may convert 1.1000 -> "1.1" but user wanted 1.10?
    // However your requirement is: keep .00 but if 1.1234 entered then full value must be displayed.
    // So this behavior is acceptable: 1.1000 -> shows "1.1" (but if you want "1.10" for 1.10 we already handled decimals.length <=2 case).
    return trimmed;
  };
  // -------------------------------------------------

  const fetchPurities = async () => {
    if (!counter?.material?.id) return;
    try {
      const res = await axios.get(
        `http://localhost:8080/api/purities/by-material/${counter.material.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPurities(res.data);
    } catch (error) {
      console.error("Error fetching purities:", error);
      toast.error("Error fetching purities");
    }
  };

  const fetchSales = async () => {
    if (!counter?.id || !counter?.material?.id) return;

    try {
      let url = "";

      if (rangeType === "range" && fromDate && toDate) {
        url = `http://localhost:8080/api/daily-sales/by-material-counter-daterange?materialId=${
          counter.material.id
        }&counterId=${counter.id}&startDate=${formatDate(
          fromDate
        )}&endDate=${formatDate(toDate)}`;
      } else if (rangeType === "single" && selectedDate) {
        url = `http://localhost:8080/api/daily-sales/by-material-counter-date?materialId=${
          counter.material.id
        }&counterId=${counter.id}&date=${formatDate(selectedDate)}`;
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
      toast.error("Error fetching sales entries");
    }
  };

  useEffect(() => {
    fetchPurities();
  }, [counter]);

  useEffect(() => {
    if (counter && purities.length > 0) {
      fetchSales();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [counter, purities, rangeType, fromDate, toDate, selectedDate]);

  const handleEditClick = (entry) => {
    setEditingRow(entry.date);
    const values = {};
    purities.forEach((p) => {
      // preload input with full precision if available, but keep as string
      const raw =
        entry[p.name] === undefined || entry[p.name] === null
          ? 0
          : entry[p.name];
      values[p.name] = formatNumberDisplay(raw);
    });
    setEditedValues(values);
  };

  const handleSave = async (entry) => {
    try {
      const salesData = {};
      purities.forEach((p) => {
        // parse the string to float (will handle 1.1234 etc)
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
      toast.success("Sales updated successfully");
    } catch (error) {
      console.error("Error updating sales:", error);
      toast.error("Failed to update sales");
    }
  };

  // ---------- Delete handler ----------
  const handleDelete = async (entry) => {
    try {
      const confirmed = window.confirm(
        `Delete all sales entries for date ${entry.date}? This will remove all purity rows for that date.`
      );
      if (!confirmed) return;

      await axios.delete("http://localhost:8080/api/daily-sales/delete", {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          materialId: counter.material.id,
          counterId: counter.id,
          date: entry.date, // backend expects ISO date (yyyy-MM-dd)
        },
      });

      toast.success("Sales entries deleted successfully");
      fetchSales();
    } catch (error) {
      console.error("Error deleting sales entries:", error);
      toast.error("Failed to delete sales entries");
    }
  };
  // -----------------------------------------

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
        ...purities.map((p) => formatNumberDisplay(entry[p.name] || 0)),
        formatNumberDisplay(entry.total || 0),
      ];
      tableRows.push(row);
    });

    const totalsRow = [
      "Total",
      ...purities.map((p) => formatNumberDisplay(columnTotals[p.name] || 0)),
      formatNumberDisplay(columnTotals.total || 0),
    ];
    tableRows.push(totalsRow);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
    });

    doc.save(`Sales_Report_${counter.name}.pdf`);
    toast.success("PDF downloaded");
  };

  const downloadExcel = () => {
    const wsData = [
      ["Date", ...purities.map((p) => p.name), "Total"],
      ...entries.map((entry) => [
        entry.date,
        ...purities.map((p) => formatNumberDisplay(entry[p.name] || 0)),
        formatNumberDisplay(entry.total || 0),
      ]),
      [
        "Total",
        ...purities.map((p) => formatNumberDisplay(columnTotals[p.name] || 0)),
        formatNumberDisplay(columnTotals.total || 0),
      ],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(wsData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "SalesData");

    XLSX.writeFile(workbook, `Sales_Report_${counter.name}.xlsx`);
    toast.success("Excel downloaded");
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <div className="view">
        <ToastContainer position="bottom-right" autoClose={3000} />

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
            <FileDown size={18} style={{ marginRight: "0.5rem" }} /> Download
            PDF
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
                <label>From Date</label>
                <DatePicker
                  value={fromDate}
                  onChange={(newVal) => setFromDate(newVal)}
                  renderInput={(params) => (
                    <TextField {...params} size="small" />
                  )}
                />
              </div>
              <div className="form-group">
                <label>To Date</label>
                <DatePicker
                  value={toDate}
                  onChange={(newVal) => setToDate(newVal)}
                  renderInput={(params) => (
                    <TextField {...params} size="small" />
                  )}
                />
              </div>
            </>
          )}

          {rangeType === "single" && (
            <div className="form-group">
              <label>Date</label>
              <DatePicker
                value={selectedDate}
                onChange={(newVal) => setSelectedDate(newVal)}
                renderInput={(params) => <TextField {...params} size="small" />}
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
                <th style={{ textAlign: "center", minWidth: "120px" }}>
                  Actions
                </th>
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
                          step="0.0001"
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
                            width: "90px",
                            textAlign: "right",
                          }}
                        />
                      ) : (
                        // display using smart formatter
                        formatNumberDisplay(entry[p.name] || 0)
                      )}
                    </td>
                  ))}

                  <td style={{ fontWeight: "bold" }}>
                    {formatNumberDisplay(entry.total || 0)}
                  </td>

                  <td
                    style={{
                      textAlign: "center",
                      minWidth: "140px",
                    }}
                  >
                    {editingRow === entry.date ? (
                      <button
                        className="btn btn-success"
                        onClick={() => handleSave(entry)}
                      >
                        Save
                      </button>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <button
                          className="btn btn-warning"
                          onClick={() => handleEditClick(entry)}
                          title="Edit row"
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          className="btn btn-danger"
                          onClick={() => handleDelete(entry)}
                          title="Delete all entries for this date"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: "bold", backgroundColor: "#f9f9f9" }}>
                <td>Total</td>
                {purities.map((p) => (
                  <td key={p.id}>
                    {formatNumberDisplay(columnTotals[p.name] || 0)}
                  </td>
                ))}
                <td>{formatNumberDisplay(columnTotals.total || 0)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </LocalizationProvider>
  );
};

export default SalesEntries;
