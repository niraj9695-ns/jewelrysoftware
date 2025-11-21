// IssuedStockEntries.jsx
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import "../assets/styles/forms.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { FileDown, FileSpreadsheet, Pencil, Trash2 } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { TextField } from "@mui/material";

const IssuedStockEntries = ({ counter, onBack }) => {
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

  // ---------------- Formatting helpers ----------------
  // If number is effectively equal to its 2-decimal rounding -> show exactly 2 decimals (keeps .00).
  // Otherwise (has >2 meaningful decimals) -> display up to 4 decimals, trimming trailing zeros.
  const trimTrailingZerosMax4 = (s) => {
    // s is expected from toFixed(4), e.g. "10.1230" or "10.0000"
    // If all decimals are zeros, we still want ".0000" for totals, but for entries earlier we prefer ".00" handled separately.
    // For trimming we remove trailing zeros, but keep at least 1 decimal if needed.
    // Example: "10.1200" -> "10.12", "10.1000" -> "10.1", "10.0000" -> "10"
    const trimmed = s.replace(/(\.\d*?[1-9])0+$/u, "$1").replace(/\.0+$/u, "");
    return trimmed;
  };

  const formatEntryDisplay = (value) => {
    // value can be number or string
    if (value === null || value === undefined) return "0.00";

    const num = typeof value === "string" ? Number(value) : value;
    if (isNaN(num)) return String(value);

    // get rounded 2 decimals
    const rounded2 = Number(num.toFixed(2));
    // treat tiny floating noise as equal
    if (Math.abs(num - rounded2) < 1e-8) {
      return rounded2.toFixed(2); // keep .00 look
    }

    // show up to 4 decimals, no FP artifacts
    const s = Number(num).toFixed(4); // "40.67200000" -> "40.6720"
    // Trim trailing zeros but keep at least one decimal place if needed
    const trimmed = trimTrailingZerosMax4(s);
    return trimmed;
  };

  const formatTotalDisplay = (value) => {
    // totals must show 4 decimals always
    if (value === null || value === undefined) return "0.0000";
    const num = typeof value === "string" ? Number(value) : value;
    if (isNaN(num)) return String(value);
    // round to 4 decimals (avoid long FP artifacts)
    return Number(num.toFixed(4)).toFixed(4);
  };
  // ----------------------------------------------------

  useEffect(() => {
    fetchPurities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (counter && purities.length) {
      fetchStockEntries();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [counter, purities, rangeType, fromDate, toDate, selectedDate]);

  const fetchPurities = async () => {
    if (!counter?.material?.id) return;

    try {
      const res = await axios.get(
        `http://localhost:8080/api/purities/by-material/${counter.material.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPurities(res.data);
    } catch (err) {
      console.error("Error fetching purities:", err);
      toast.error("Error fetching purities");
    }
  };

  const fetchStockEntries = async () => {
    if (!counter?.id || !counter?.material?.id) return;

    try {
      let url = "";
      if (rangeType === "range" && fromDate && toDate) {
        url = `http://localhost:8080/api/issued-stock/by-material-counter-daterange?materialId=${counter.material.id}&counterId=${counter.id}&startDate=${fromDate}&endDate=${toDate}`;
      } else if (rangeType === "single" && selectedDate) {
        url = `http://localhost:8080/api/issued-stock/by-material-counter-date?materialId=${counter.material.id}&counterId=${counter.id}&date=${selectedDate}`;
      } else {
        url = `http://localhost:8080/api/issued-stock/by-material-counter?materialId=${counter.material.id}&counterId=${counter.id}`;
      }

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = Array.isArray(res.data) ? res.data : [];

      // Group rows by date__billNo
      const grouped = {};

      data.forEach((entry) => {
        const date = entry.date;
        const billNo = entry.billNo || "-";
        const purity = entry.purity?.name;
        const weight = parseFloat(entry.issuedWeight || 0);
        const key = `${date}__${billNo}`;

        if (!grouped[key]) {
          grouped[key] = { date, billNo, total: 0 };
          purities.forEach((p) => {
            grouped[key][p.name] = 0;
          });
        }

        if (purity && grouped[key][purity] !== undefined) {
          grouped[key][purity] += weight;
        }

        grouped[key].total += weight;
      });

      const result = Object.values(grouped);

      // calculate totals (numeric)
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
      console.error("Error fetching issued stock entries:", error);
      toast.error("Error fetching issued stock entries");
    }
  };

  const handleEditClick = (entry) => {
    const key = `${entry.date}__${entry.billNo}`;
    setEditingRow(key);

    const values = {
      billNo: entry.billNo === "-" ? "" : entry.billNo || "",
    };

    purities.forEach((p) => {
      const raw =
        entry[p.name] === undefined || entry[p.name] === null
          ? 0
          : entry[p.name];
      // preload input string with user-friendly representation:
      // If entry had <=2 decimals, show 2 decimals (e.g., "10.00"), else show up to 4 trimmed decimals (e.g., "10.1234")
      values[p.name] = formatEntryDisplay(raw);
    });

    setEditedValues(values);
  };

  const handleSave = async (entry) => {
    try {
      const issuedData = {};
      purities.forEach((p) => {
        // parse float from input string; if invalid parseFloat -> NaN -> fallback to 0
        const v = parseFloat(editedValues[p.name]);
        issuedData[p.name] = Number.isFinite(v) ? v : 0;
      });

      const payload = {
        date: entry.date,
        counterId: counter.id,
        materialId: counter.material.id,
        billNo: editedValues.billNo,
        issuedData,
      };

      await axios.put(
        "http://localhost:8080/api/issued-stock/update",
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      toast.success("Stock entry updated successfully!");
      setEditingRow(null);
      fetchStockEntries();
    } catch (error) {
      console.error("Error updating stock entry:", error);
      toast.error("Failed to update stock entry.");
    }
  };

  const handleDelete = async (entry) => {
    try {
      const confirmed = window.confirm(
        `Delete issued stock for date ${entry.date} and bill no "${entry.billNo}"? This will remove all related purity entries for that row.`
      );
      if (!confirmed) return;

      const params = {
        materialId: counter.material.id,
        counterId: counter.id,
        date: entry.date,
      };
      if (entry.billNo && entry.billNo !== "-") {
        params.billNo = entry.billNo;
      }

      await axios.delete("http://localhost:8080/api/issued-stock/delete", {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });

      toast.success("Stock entry deleted successfully!");
      fetchStockEntries();
    } catch (error) {
      console.error("Error deleting stock entry:", error);
      toast.error("Failed to delete stock entry.");
    }
  };

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
    const tableColumn = [
      "Date",
      "Bill No",
      ...purities.map((p) => p.name),
      "Total",
    ];
    const tableRows = [];

    entries.forEach((entry) => {
      const row = [
        entry.date,
        entry.billNo === "-" ? "" : entry.billNo,
        ...purities.map((p) => formatEntryDisplay(entry[p.name] || 0)),
        formatTotalDisplay(entry.total || 0),
      ];
      tableRows.push(row);
    });

    const totalsRow = [
      "Total",
      "",
      ...purities.map((p) => formatEntryDisplay(columnTotals[p.name] || 0)),
      formatTotalDisplay(columnTotals.total || 0),
    ];
    tableRows.push(totalsRow);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
    });

    doc.save(`Issued_Stock_${counter.name}.pdf`);
  };

  const downloadExcel = () => {
    const wsData = [
      ["Date", "Bill No", ...purities.map((p) => p.name), "Total"],
      ...entries.map((entry) => [
        entry.date,
        entry.billNo === "-" ? "" : entry.billNo,
        ...purities.map((p) => formatEntryDisplay(entry[p.name] || 0)),
        formatTotalDisplay(entry.total || 0),
      ]),
      [
        "Total",
        "",
        ...purities.map((p) => formatEntryDisplay(columnTotals[p.name] || 0)),
        formatTotalDisplay(columnTotals.total || 0),
      ],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(wsData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "IssuedStock");

    XLSX.writeFile(workbook, `Issued_Stock_${counter.name}.xlsx`);
  };

  return (
    <div className="view">
      <ToastContainer position="bottom-right" autoClose={3000} />

      <button
        onClick={onBack}
        className="btn btn-secondary"
        style={{ marginBottom: "1rem" }}
      >
        ← Back to Counters
      </button>

      <h2>Issued Stock Summary for {counter?.name}</h2>

      {/* PDF/Excel Buttons */}
      <div className="report-actions" style={{ marginBottom: "1.5rem" }}>
        <button className="btn btn-primary" onClick={downloadPDF}>
          <FileDown size={18} style={{ marginRight: "0.5rem" }} />
          Download PDF
        </button>
        <button
          className="btn btn-secondary"
          onClick={downloadExcel}
          style={{ marginLeft: "1rem" }}
        >
          <FileSpreadsheet size={18} style={{ marginRight: "0.5rem" }} />
          Download Excel
        </button>
      </div>

      {/* Date Filters */}
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <div
          className="form-row"
          style={{
            marginBottom: "1.5rem",
            display: "flex",
            flexWrap: "wrap",
            gap: "1rem",
            alignItems: "flex-end",
          }}
        >
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
                  value={fromDate ? new Date(fromDate) : null}
                  onChange={(date) =>
                    setFromDate(date ? date.toISOString().split("T")[0] : "")
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      size="small"
                      style={{ minWidth: "150px" }}
                    />
                  )}
                />
              </div>

              <div className="form-group">
                <label>To Date</label>
                <DatePicker
                  value={toDate ? new Date(toDate) : null}
                  onChange={(date) =>
                    setToDate(date ? date.toISOString().split("T")[0] : "")
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      size="small"
                      style={{ minWidth: "150px" }}
                    />
                  )}
                />
              </div>
            </>
          )}

          {rangeType === "single" && (
            <div className="form-group">
              <label>Date</label>
              <DatePicker
                value={selectedDate ? new Date(selectedDate) : null}
                onChange={(date) =>
                  setSelectedDate(date ? date.toISOString().split("T")[0] : "")
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    size="small"
                    style={{ minWidth: "150px" }}
                  />
                )}
              />
            </div>
          )}
        </div>
      </LocalizationProvider>

      {/* Table */}
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
              <th style={{ textAlign: "center", minWidth: "120px" }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const key = `${entry.date}__${entry.billNo}`;
              return (
                <tr key={key} ref={editingRow === key ? editingRef : null}>
                  <td>{entry.date}</td>
                  <td>
                    {editingRow === key ? (
                      <input
                        type="text"
                        value={editedValues.billNo}
                        onChange={(e) =>
                          setEditedValues({
                            ...editedValues,
                            billNo: e.target.value,
                          })
                        }
                        style={{
                          width: "80px",
                          padding: "4px",
                          border: "1px solid #ccc",
                          borderRadius: "5px",
                        }}
                      />
                    ) : entry.billNo === "-" ? (
                      ""
                    ) : (
                      entry.billNo
                    )}
                  </td>

                  {purities.map((p) => (
                    <td key={p.id}>
                      {editingRow === key ? (
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
                            width: "90px",
                            padding: "4px",
                            border: "1px solid #ccc",
                            borderRadius: "5px",
                            textAlign: "right",
                          }}
                        />
                      ) : (
                        formatEntryDisplay(entry[p.name] || 0)
                      )}
                    </td>
                  ))}

                  <td style={{ fontWeight: "bold" }}>
                    {formatTotalDisplay(entry.total || 0)}
                  </td>

                  <td
                    style={{
                      textAlign: "center",
                      minWidth: "140px",
                    }}
                  >
                    {editingRow === key ? (
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
                          title="Delete row"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ fontWeight: "bold", backgroundColor: "#f0f0f0" }}>
              <td colSpan={2}>Total</td>
              {purities.map((p) => (
                <td key={p.id}>
                  {formatEntryDisplay(columnTotals[p.name] || 0)}
                </td>
              ))}
              <td>{formatTotalDisplay(columnTotals.total || 0)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  );
};

export default IssuedStockEntries;
