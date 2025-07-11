import React, { useEffect, useState } from "react";
import axios from "axios";
import "../assets/styles/forms.css";
import "../assets/styles/tables.css";
import "../assets/styles/dashboard.css";

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

    // Restore report data from localStorage
    const savedReport = localStorage.getItem("balanceReportData");
    const savedFilters = localStorage.getItem("balanceReportFilters");

    if (savedReport) {
      setReportData(JSON.parse(savedReport));
    }

    if (savedFilters) {
      const filters = JSON.parse(savedFilters);
      setCounterId(filters.counterId || "");
      setRangeType(filters.rangeType || "range");
      setFromDate(filters.fromDate || "");
      setToDate(filters.toDate || "");
      setSingleDate(filters.singleDate || "");
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
        // all-time
        response = await axios.get(`http://localhost:8080/api/report/summary`, {
          params: { counterId },
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      setReportData(response.data);

      // Save to localStorage
      localStorage.setItem("balanceReportData", JSON.stringify(response.data));
      localStorage.setItem(
        "balanceReportFilters",
        JSON.stringify({ counterId, rangeType, fromDate, toDate, singleDate })
      );
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
    localStorage.removeItem("balanceReportData");
    localStorage.removeItem("balanceReportFilters");
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

        <div className="excel-table-container">
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

        {/* Close Button */}
        <div className="report-actions" style={{ marginTop: "1rem" }}>
          <button
            type="button"
            className="btn btn-danger"
            onClick={closeReport}
          >
            <i data-lucide="x-circle"></i> Close Report
          </button>
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

        <div className="report-controls">
          <div className="report-controls-grid">
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
        </div>

        <div id="balanceReportContent" className="report-content">
          {renderTable()}
        </div>
      </div>
    </div>
  );
};

export default BalanceReport;
