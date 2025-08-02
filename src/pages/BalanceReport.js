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
import { BarChart3, Download } from "lucide-react";
import { useMaterial } from "../components/MaterialContext";
import { InfinitySpin } from "react-loader-spinner";
import * as XLSX from "xlsx";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import TextField from "@mui/material/TextField";

const COLORS = [
  "#FF6B6B",
  "#FFD93D",
  "#6BCB77",
  "#4D96FF",
  "#9D4EDD",
  "#FF9F1C",
];
const BalanceReport = () => {
  const [counters, setCounters] = useState([]);
  const [counterId, setCounterId] = useState("");
  const [rangeType, setRangeType] = useState("range");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [singleDate, setSingleDate] = useState("");
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  const { selectedMaterialId } = useMaterial();
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (selectedMaterialId) {
      fetchCounters();
    }

    // Retrieve saved report data
    const savedData = localStorage.getItem("balanceReport");
    const savedRangeType = localStorage.getItem("balanceReportRangeType");
    const savedCounterId = localStorage.getItem("balanceReportCounterId");

    try {
      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (parsed && (Array.isArray(parsed) || typeof parsed === "object")) {
          setReportData(parsed);
          if (savedRangeType) setRangeType(savedRangeType);
          if (savedCounterId) setCounterId(savedCounterId);
        }
      }
    } catch (err) {
      console.error("Failed to parse saved report data:", err);
      localStorage.removeItem("balanceReport");
    }
  }, [selectedMaterialId]);

  const fetchCounters = async () => {
    try {
      const res = await axios.get(
        `http://localhost:8080/api/counters/by-material/${selectedMaterialId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setCounters(res.data);
    } catch (error) {
      console.error("Error fetching counters:", error);
    }
  };

  const generateReport = async () => {
    if (!counterId || !selectedMaterialId) {
      toast.warning("Please select both counter and material.");
      return;
    }

    try {
      setLoading(true);
      let response;

      if (rangeType === "single") {
        if (!singleDate) {
          toast.warning("Please select a date.");
          setLoading(false);
          return;
        }
        response = await axios.get(`http://localhost:8080/api/report`, {
          params: {
            date: singleDate,
            counterId,
            materialId: selectedMaterialId,
          },
          headers: { Authorization: `Bearer ${token}` },
        });
      } else if (rangeType === "range") {
        if (!fromDate || !toDate) {
          toast.warning("Please select start and end date.");
          setLoading(false);
          return;
        }
        response = await axios.get(`http://localhost:8080/api/report/summary`, {
          params: {
            startDate: fromDate,
            endDate: toDate,
            counterId,
            materialId: selectedMaterialId,
          },
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        if (!fromDate || !toDate) {
          toast.warning("Please select start and end date.");
          setLoading(false);
          return;
        }
        response = await axios.get(
          `http://localhost:8080/api/report/monthly-summary`,
          {
            params: {
              startDate: fromDate,
              endDate: toDate,
              counterId,
              materialId: selectedMaterialId,
            },
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      }

      const data = response.data;
      setReportData(data);

      localStorage.setItem("balanceReport", JSON.stringify(data));
      localStorage.setItem("balanceReportRangeType", rangeType);
      localStorage.setItem("balanceReportCounterId", counterId);

      toast.success("Report generated successfully!");
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate report.");
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    if (!reportData || Object.keys(reportData).length === 0) {
      toast.warning("No report data to export.");
      return;
    }

    try {
      const workbook = XLSX.utils.book_new();

      const createSheet = (data, title) => {
        const purityKeys = Object.keys(data[0]?.purityWeights || {});
        const sheetData = [
          ["Type", ...purityKeys, "Total"],
          ...data.map((row) => [
            row.type,
            ...purityKeys.map(
              (key) => row.purityWeights[key]?.toFixed(3) || "0.000"
            ),
            row.total?.toFixed(3) || "0.000",
          ]),
        ];
        const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
        XLSX.utils.book_append_sheet(workbook, worksheet, title);
      };

      if (rangeType === "all-time") {
        Object.entries(reportData).forEach(([month, data]) => {
          if (Array.isArray(data) && data.length > 0) {
            createSheet(data, month);
          }
        });
      } else {
        if (Array.isArray(reportData) && reportData.length > 0) {
          createSheet(reportData, "Balance Report");
        }
      }

      const filename = `BalanceReport_${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`;
      XLSX.writeFile(workbook, filename);
      toast.success("Excel file downloaded successfully!");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export report.");
    }
  };

  const closeReport = () => {
    setReportData(null);
    localStorage.removeItem("balanceReport");
    localStorage.removeItem("balanceReportRangeType");
    localStorage.removeItem("balanceReportCounterId");
  };
  const getPurityChartData = () => {
    if (!reportData || Object.keys(reportData).length === 0) return [];

    const isMonthly = rangeType === "all-time";
    let allRows = [];

    if (isMonthly) {
      allRows = Object.values(reportData).filter(Array.isArray).flat();
    } else if (Array.isArray(reportData)) {
      allRows = reportData;
    } else {
      return [];
    }

    const purityTotals = {};
    allRows.forEach((row) => {
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
    if (loading) {
      return (
        <div style={{ textAlign: "center", margin: "30px 0" }}>
          <InfinitySpin height={150} width={150} color="#ef9f1fff" />
          <p style={{ marginTop: "10px", color: "#666" }}>Loading Report...</p>
        </div>
      );
    }

    if (!reportData || Object.keys(reportData).length === 0) {
      return (
        <div className="no-data">
          <h3>No Report Data</h3>
          <p>Try changing filter options</p>
        </div>
      );
    }

    const isMonthly = rangeType === "all-time";

    const renderSingleTable = (data, title) => {
      if (!Array.isArray(data)) return null; // 🚨 Early return if data is not an array

      const purityKeys = Object.keys(data[0]?.purityWeights || {});
      return (
        <div className="excel-report-container" key={title}>
          <div className="report-header">
            <h2>{title}</h2>
            <div className="date-range">Showing {data.length} entries</div>
          </div>
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
                {data.map((row, idx) => (
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
                      {row.total?.toFixed(3) || "0.000"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    };

    if (isMonthly) {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
          {Object.entries(reportData).map(([month, data]) =>
            Array.isArray(data) ? renderSingleTable(data, month) : null
          )}
        </div>
      );
    }

    return renderSingleTable(reportData, "Balance Report");
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
                <option value="all-time">Monthly</option>
              </select>
            </div>

            <LocalizationProvider dateAdapter={AdapterDateFns}>
              {(rangeType === "range" || rangeType === "all-time") && (
                <div className="date-inputs">
                  <div className="form-group">
                    <label htmlFor="reportFromDate">Start Date</label>
                    <DatePicker
                      disableFuture
                      value={fromDate ? new Date(fromDate) : null}
                      onChange={(newValue) => {
                        if (newValue)
                          setFromDate(newValue.toISOString().split("T")[0]);
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          required
                          size="small"
                          id="reportFromDate"
                          className="form-input"
                          sx={{ minWidth: "200px" }}
                        />
                      )}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="reportToDate">End Date</label>
                    <DatePicker
                      disableFuture
                      value={toDate ? new Date(toDate) : null}
                      onChange={(newValue) => {
                        if (newValue)
                          setToDate(newValue.toISOString().split("T")[0]);
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          required
                          size="small"
                          id="reportToDate"
                          className="form-input"
                          sx={{ minWidth: "200px" }}
                        />
                      )}
                    />
                  </div>
                </div>
              )}

              {rangeType === "single" && (
                <div className="date-inputs">
                  <div className="form-group">
                    <label htmlFor="reportSingleDate">Select Date</label>
                    <DatePicker
                      disableFuture
                      value={singleDate ? new Date(singleDate) : null}
                      onChange={(newValue) => {
                        if (newValue)
                          setSingleDate(newValue.toISOString().split("T")[0]);
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          required
                          size="small"
                          id="reportSingleDate"
                          className="form-input"
                          sx={{ minWidth: "200px" }}
                        />
                      )}
                    />
                  </div>
                </div>
              )}
            </LocalizationProvider>

            <div className="report-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={generateReport}
              >
                <BarChart3 size={16} style={{ marginRight: "8px" }} />
                Generate Report
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={exportReport}
              >
                <Download size={16} style={{ marginRight: "8px" }} />
                Export Report
              </button>
            </div>
          </div>

          {reportData && (
            <div
              style={{
                width: "420px",
                height: "320px",
                flexShrink: 0,
                boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
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

        {reportData && (
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
              }}
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

      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
    </div>
  );
};

export default BalanceReport;
