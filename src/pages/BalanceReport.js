import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { FiX } from "react-icons/fi"; 
import "../assets/styles/forms.css";
import "../assets/styles/tables.css";
import "../assets/styles/dashboard.css";

const COLORS = [
  "#FF6B6B", // Red-ish
  "#FFD93D", // Yellow-ish
  "#6BCB77", // Green-ish
  "#4D96FF", // Blue-ish
  "#9D4EDD", // Purple-ish
  "#FF9F1C", // Orange-ish
];

const BalanceReport = () => {
  const [counters, setCounters] = useState([]);
  const [counterId, setCounterId] = useState("");
  const [rangeType, setRangeType] = useState("range");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [singleDate, setSingleDate] = useState("");
  const [reportData, setReportData] = useState(null);

  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchCounters();

    const saved = localStorage.getItem("balanceReport");
    if (saved) {
      setReportData(JSON.parse(saved));
    }
  }, []);

  const fetchCounters = async () => {
    try {
      const res = await axios.get("http://localhost:8080/api/counters", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCounters(res.data);
    } catch (error) {
      console.error("Error fetching counters:", error);
    }
  };

  const generateReport = async () => {
    if (!counterId) {
      alert("Please select a counter.");
      return;
    }

    try {
      let response;

      if (rangeType === "single") {
        if (!singleDate) {
          alert("Please select a date.");
          return;
        }
        response = await axios.get(`http://localhost:8080/api/report`, {
          params: { date: singleDate, counterId },
          headers: { Authorization: `Bearer ${token}` },
        });
      } else if (rangeType === "range") {
        if (!fromDate || !toDate) {
          alert("Please select start and end date.");
          return;
        }
        response = await axios.get(`http://localhost:8080/api/report/summary`, {
          params: { startDate: fromDate, endDate: toDate, counterId },
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        response = await axios.get(`http://localhost:8080/api/report/summary`, {
          params: { counterId },
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      setReportData(response.data);
      localStorage.setItem("balanceReport", JSON.stringify(response.data));
    } catch (error) {
      console.error("Error generating report:", error);
      alert("Failed to generate report.");
    }
  };

  const exportReport = () => {
    alert("Export functionality not implemented yet.");
  };

  const closeReport = () => {
    setReportData(null);
    localStorage.removeItem("balanceReport");
  };

  const getPurityChartData = () => {
    if (!reportData || reportData.length === 0) return [];

    const purityTotals = {};
    reportData.forEach((row) => {
      Object.entries(row.purityWeights || {}).forEach(([purity, value]) => {
        if (!purityTotals[purity]) purityTotals[purity] = 0;
        purityTotals[purity] += value;
      });
    });

    return Object.entries(purityTotals).map(([purity, total]) => ({
      purity,
      total: parseFloat(total.toFixed(3)),
    }));
  };

  const renderTable = () => {
    if (!reportData || reportData.length === 0) {
      return (
        <div className="no-data">
          <h3>No Report Data</h3>
          <p>Try changing filter options</p>
        </div>
      );
    }

    const purityKeys = Object.keys(reportData[0].purityWeights || {});

    return (
      <div className="excel-report-container">
        <div className="report-header">
          <h2>Balance Report</h2>
          <div className="date-range">
            Showing {reportData.length} entries for selected date range
          </div>
        </div>

        <div style={{ display: "flex", gap: "20px" }}>
          <div className="excel-table-container" style={{ flex: 1 }}>
            <table className="excel-table">
              <thead>
                <tr>
                  <th className="main-header">Type</th>
                  {purityKeys.map((key) => (
                    <th key={key} className="purity-headers">
                      {key}
                    </th>
                  ))}
                  <th className="total-header">Total</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((row, idx) => (
                  <tr
                    key={idx}
                    className={
                      row.type === "Opening"
                        ? "opening-row"
                        : row.type === "Issued"
                        ? "issue-maal-row"
                        : row.type === "Sold"
                        ? "sales-row"
                        : row.type === "Remaining"
                        ? "stock-needed"
                        : ""
                    }
                  >
                    <td className="row-header">{row.type}</td>
                    {purityKeys.map((key) => (
                      <td key={key} className="number-cell">
                        {row.purityWeights[key]?.toFixed(3) || "0.000"}
                      </td>
                    ))}
                    <td className="total-column number-cell">
                      {row.total.toFixed(3)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="view">
      <div className="section">
        <div className="section-header">
          <div>
            <h2>Balance Report</h2>
            <p>View balance reports for individual counters</p>
          </div>
        </div>

        <div
          className="report-controls"
          style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}
        >
          {/* Filter Form */}
          <div className="report-controls-grid" style={{ flex: 1 }}>
            <div className="form-group">
              <label htmlFor="reportCounterSelect">Counter</label>
              <select
                id="reportCounterSelect"
                className="form-select"
                value={counterId}
                onChange={(e) => setCounterId(e.target.value)}
              >
                <option value="">Select Counter</option>
                {counters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="dateRangeType">Date Range Type</label>
              <select
                id="dateRangeType"
                className="form-select"
                value={rangeType}
                onChange={(e) => setRangeType(e.target.value)}
              >
                <option value="range">Date Range</option>
                <option value="single">Single Date</option>
                <option value="all-time">All Time</option>
              </select>
            </div>

            {rangeType === "range" && (
              <div className="date-inputs">
                <div className="form-group">
                  <label htmlFor="reportFromDate">Start Date</label>
                  <input
                    type="date"
                    id="reportFromDate"
                    className="form-input"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="reportToDate">End Date</label>
                  <input
                    type="date"
                    id="reportToDate"
                    className="form-input"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                  />
                </div>
              </div>
            )}

            {rangeType === "single" && (
              <div className="date-inputs">
                <div className="form-group">
                  <label htmlFor="reportSingleDate">Select Date</label>
                  <input
                    type="date"
                    id="reportSingleDate"
                    className="form-input"
                    value={singleDate}
                    onChange={(e) => setSingleDate(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="report-actions">
              <button
                type="button"
                id="generateReportBtn"
                className="btn btn-primary"
                onClick={generateReport}
              >
                <i data-lucide="bar-chart-3"></i> Generate Report
              </button>
              <button
                type="button"
                id="exportReportBtn"
                className="btn btn-secondary"
                onClick={exportReport}
              >
                <i data-lucide="download"></i> Export Report
              </button>
            </div>
          </div>

          {/* Purity-wise Vertical Bar Chart */}
          {reportData && reportData.length > 0 && (
            <div
              style={{
                width: "420px",
                height: "320px",
                flexShrink: 0,
                boxShadow:
                  "0 4px 8px rgba(0, 0, 0, 0.1)",
                borderRadius: "8px",
                backgroundColor: "#fff",
                padding: "12px",
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={getPurityChartData()}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="purity"
                    tick={{ fontWeight: "bold", fill: "#444" }}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis />
                  <Tooltip
                    cursor={{ fill: "rgba(0,0,0,0.1)" }}
                    formatter={(value) => value.toFixed(3)}
                  />
                  <Bar dataKey="total">
                    {getPurityChartData().map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Beautiful Close Button */}
        {reportData && reportData.length > 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: "10px",
              marginRight: "20px",
            }}
          >
            <button
              onClick={closeReport}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                backgroundColor: "#e63946",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: "30px",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "14px",
                boxShadow: "0 4px 8px rgba(230, 57, 70, 0.4)",
                transition: "background-color 0.3s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#d62828")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#e63946")}
              title="Close Balance Sheet"
              aria-label="Close Balance Sheet"
            >
              <FiX size={18} />
              Close Balance Sheet
            </button>
          </div>
        )}

        <div id="balanceReportContent" className="report-content">
          {renderTable()}
        </div>
      </div>
    </div>
  );
};

export default BalanceReport;
