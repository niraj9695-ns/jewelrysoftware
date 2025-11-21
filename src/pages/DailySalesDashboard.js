import React, { useEffect, useState, useRef } from "react";
import { ArrowLeft, RotateCcw, Save } from "lucide-react";
import axios from "axios";
import { useMaterial } from "../components/MaterialContext";
import "../assets/styles/dashboard.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { format } from "date-fns";
import Swal from "sweetalert2";

const DailySalesDashboard = ({ switchView }) => {
  const { selectedMaterialId } = useMaterial();
  const [currentDate, setCurrentDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [salesData, setSalesData] = useState({});
  const [counters, setCounters] = useState([]);
  const [purities, setPurities] = useState([]);

  const token = localStorage.getItem("token");

  // Refs
  // 2D array: inputRefs.current[rowIndex][colIndex]
  const inputRefs = useRef([]);
  const datePickerRef = useRef(null);

  useEffect(() => {
    if (selectedMaterialId) {
      fetchCountersAndPurities(selectedMaterialId);
    }
  }, [selectedMaterialId]);

  // ---------- Keyboard shortcuts (browser + JavaFX WebView) ----------
  useEffect(() => {
    const pressedKeys = new Set();

    const handleKeyDown = (e) => {
      const key = e.key?.toLowerCase?.();
      pressedKeys.add(key);

      // Space → focus first input
      if (e.code === "Space" || key === " ") {
        e.preventDefault();
        const grid = getInputGrid();
        if (grid[0]?.[0]) {
          grid[0][0].focus();
          grid[0][0].select?.();
        }
      }

      // Reset → R
      if (key === "r") {
        e.preventDefault();
        resetAllInputs();
      }

      // Save → S + U
      if (pressedKeys.has("s") && pressedKeys.has("u")) {
        e.preventDefault();
        // call the same save function (it will validate)
        saveSalesData();
      }

      // Date picker → D
      if (key === "d") {
        e.preventDefault();
        if (datePickerRef.current) {
          const input = datePickerRef.current.querySelector("input");
          if (input) {
            input.focus();
            input.click();
          }
        }
      }

      // Arrow navigation
      if (["arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
        e.preventDefault();
        moveFocus(e.key);
      }
    };

    const handleKeyUp = (e) => {
      pressedKeys.delete(e.key?.toLowerCase?.());
    };

    // Capture phase = true → intercept before WebView/default input behavior
    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("keyup", handleKeyUp, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("keyup", handleKeyUp, true);
    };
  }, [counters, purities, salesData, currentDate]);

  // Build a grid of inputs from refs
  const getInputGrid = () => {
    const grid = [];
    for (let r = 0; r < counters.length; r++) {
      const row = [];
      for (let c = 0; c < purities.length; c++) {
        const el = inputRefs.current[r]?.[c];
        if (el) row.push(el);
      }
      grid.push(row);
    }
    return grid;
  };

  const moveFocus = (direction) => {
    const grid = getInputGrid();
    if (!grid.length) return;

    // Find focused position
    let rowIndex = -1;
    let colIndex = -1;
    outer: for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        if (grid[r][c] === document.activeElement) {
          rowIndex = r;
          colIndex = c;
          break outer;
        }
      }
    }
    if (rowIndex === -1 || colIndex === -1) return;

    let nextRow = rowIndex;
    let nextCol = colIndex;

    switch (direction.toLowerCase()) {
      case "arrowright":
        // wrap to first col in same row
        nextCol = (colIndex + 1) % grid[rowIndex].length;
        break;
      case "arrowleft":
        // wrap to last col in same row
        nextCol =
          (colIndex - 1 + grid[rowIndex].length) % grid[rowIndex].length;
        break;
      case "arrowdown":
        if (rowIndex + 1 < grid.length) {
          nextRow = rowIndex + 1;
          // keep same column index (clamp if needed)
          if (nextCol >= grid[nextRow].length)
            nextCol = grid[nextRow].length - 1;
        }
        break;
      case "arrowup":
        if (rowIndex - 1 >= 0) {
          nextRow = rowIndex - 1;
          if (nextCol >= grid[nextRow].length)
            nextCol = grid[nextRow].length - 1;
        }
        break;
      default:
        break;
    }

    const nextEl = grid[nextRow]?.[nextCol];
    if (nextEl) {
      nextEl.focus();
      nextEl.select?.();
    }
  };

  const fetchCountersAndPurities = async (materialId) => {
    try {
      const [counterRes, purityRes] = await Promise.all([
        axios.get(
          `http://localhost:8080/api/counters/by-material/${materialId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        ),
        axios.get(
          `http://localhost:8080/api/purities/by-material/${materialId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        ),
      ]);
      setCounters(counterRes.data || []);
      setPurities(purityRes.data || []);
      inputRefs.current = []; // reset grid refs
    } catch (error) {
      toast.error("Error fetching counters or purities.");
    }
  };

  const getKey = (counterId, purityId) =>
    `${currentDate}_${counterId}_${purityId}`;

  const getSavedValue = (counterId, purityId) => {
    const key = getKey(counterId, purityId);
    return salesData[key] ?? "";
  };

  const updateSalesValue = (counterId, purityId, value) => {
    const key = getKey(counterId, purityId);
    setSalesData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const resetAllInputs = () => {
    Swal.fire({
      title: "Are you sure?",
      text: "This will clear all entries and cannot be undone!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, reset it!",
    }).then((result) => {
      if (result.isConfirmed) {
        const newData = { ...salesData };
        counters.forEach((counter) => {
          purities.forEach((purity) => {
            const key = getKey(counter.id, purity.id);
            delete newData[key];
          });
        });
        setSalesData(newData);
        // focus first input if present
        const firstInput = inputRefs.current?.[0]?.[0];
        if (firstInput) {
          firstInput.focus();
          firstInput.select?.();
        }
        Swal.fire("Reset!", "All inputs have been cleared.", "success");
      }
    });
  };

  // Remove keys in salesData that belong to currentDate
  const clearCurrentDateEntries = () => {
    setSalesData((prev) => {
      const next = { ...prev };
      const prefix = `${currentDate}_`;
      Object.keys(prev).forEach((k) => {
        if (k.startsWith(prefix)) delete next[k];
      });
      return next;
    });
    // reset refs grid focus to first cell if exists
    const firstInput = inputRefs.current?.[0]?.[0];
    if (firstInput) {
      firstInput.focus();
      firstInput.select?.();
    }
  };

  const saveSalesData = async () => {
    if (!selectedMaterialId) {
      toast.warn("Please select a material before saving.");
      return;
    }

    const salesPayloads = [];

    counters.forEach((counter) => {
      const salesDataMap = {};
      purities.forEach((purity) => {
        const key = getKey(counter.id, purity.id);
        const raw = salesData[key];
        const value = parseFloat(raw);
        if (!isNaN(value) && value > 0) {
          salesDataMap[purity.name] = value;
        }
      });
      if (Object.keys(salesDataMap).length > 0) {
        salesPayloads.push({
          materialId: selectedMaterialId,
          counterId: counter.id,
          date: currentDate,
          salesData: salesDataMap,
        });
      }
    });

    if (salesPayloads.length === 0) {
      toast.warn("Please enter at least one value before saving.");
      return;
    }

    try {
      // Use Swal to show a quick "saving" loader (optional)
      Swal.fire({
        title: "Submitting...",
        text: "Please wait while the sales data is saved.",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      for (const payload of salesPayloads) {
        await axios.post("http://localhost:8080/api/daily-sales/add", payload, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
      }

      Swal.close();
      toast.success("Sales data submitted successfully!");

      // Clear only the entries for the current date (reset the form for that date)
      clearCurrentDateEntries();
    } catch (error) {
      Swal.close();
      toast.error("Failed to submit sales data.");
    }
  };

  const calculateRowTotal = (counterId) =>
    purities.reduce((sum, purity) => {
      const value = parseFloat(getSavedValue(counterId, purity.id));
      return sum + (isNaN(value) ? 0 : value);
    }, 0);

  const calculateColumnTotal = (purityId) =>
    counters.reduce((sum, counter) => {
      const value = parseFloat(getSavedValue(counter.id, purityId));
      return sum + (isNaN(value) ? 0 : value);
    }, 0);

  const calculateGrandTotal = () =>
    counters.reduce((sum, counter) => sum + calculateRowTotal(counter.id), 0);

  return (
    <div id="dailySalesDashboardSection" className="section">
      <ToastContainer position="bottom-right" autoClose={3000} />
      <div className="daily-sales-header">
        <div className="header-left-section">
          <button className="back-btn" onClick={() => switchView("counters")}>
            <ArrowLeft />
          </button>
          <div className="header-info">
            <h2>Daily Update Dashboard</h2>
            <p id="dailySalesDate">
              Update daily inventory data -{" "}
              {new Date(currentDate).toLocaleDateString("en-GB")}
            </p>
          </div>
        </div>

        <div className="header-actions-section">
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <div ref={datePickerRef}>
              <DatePicker
                disableFuture
                label={null}
                value={new Date(currentDate)}
                onChange={(newValue) => {
                  if (newValue) {
                    setCurrentDate(format(newValue, "yyyy-MM-dd"));
                  }
                }}
                slotProps={{
                  textField: {
                    size: "small",
                    className: "form-input",
                    variant: "outlined",
                    InputProps: { style: { height: "40px" } },
                  },
                }}
              />
            </div>
          </LocalizationProvider>
          <button
            id="resetDailySales"
            className="btn btn-danger"
            onClick={resetAllInputs}
          >
            <RotateCcw />
            Reset
          </button>
          <button
            id="saveDailySales"
            className="btn btn-warning"
            onClick={saveSalesData}
          >
            <Save />
            Save Updates
          </button>
        </div>
      </div>

      <div className="daily-sales-table-container">
        <table className="daily-sales-table" id="dailySalesTable">
          <thead>
            <tr>
              <th>Counter</th>
              {purities.map((purity) => (
                <th key={purity.id}>{purity.name}</th>
              ))}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {counters.length === 0 || purities.length === 0 ? (
              <tr>
                <td
                  colSpan="100%"
                  style={{ textAlign: "center", padding: "2rem" }}
                >
                  Please create counters and purities first
                </td>
              </tr>
            ) : (
              <>
                {counters.map((counter, rowIndex) => (
                  <tr key={counter.id}>
                    <td>{counter.name}</td>
                    {purities.map((purity, colIndex) => (
                      <td key={purity.id}>
                        <input
                          ref={(el) => {
                            if (!inputRefs.current[rowIndex]) {
                              inputRefs.current[rowIndex] = [];
                            }
                            inputRefs.current[rowIndex][colIndex] = el;
                          }}
                          type="number"
                          className="daily-sales-input"
                          min="0"
                          step="0.001"
                          value={getSavedValue(counter.id, purity.id)}
                          onChange={(e) =>
                            updateSalesValue(
                              counter.id,
                              purity.id,
                              e.target.value
                            )
                          }
                        />
                      </td>
                    ))}
                    <td className="row-total">
                      {calculateRowTotal(counter.id).toFixed(2)}
                    </td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td>Total</td>
                  {purities.map((purity) => (
                    <td key={purity.id} className="column-total">
                      {calculateColumnTotal(purity.id).toFixed(2)}
                    </td>
                  ))}
                  <td className="grand-total">
                    {calculateGrandTotal().toFixed(2)}
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DailySalesDashboard;
