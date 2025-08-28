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
import Swal from "sweetalert2"; // 🚀 Stylish alerts

const IssuedStockDashboard = ({ switchView }) => {
  const { selectedMaterialId } = useMaterial();
  const [currentDate, setCurrentDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [stockData, setStockData] = useState({});
  const [billNumbers, setBillNumbers] = useState({});
  const [counters, setCounters] = useState([]);
  const [purities, setPurities] = useState([]);
  const billInputsRef = useRef({});
  const stockInputsRef = useRef({});
  const datePickerRef = useRef(null);

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (selectedMaterialId) {
      fetchCountersAndPurities(selectedMaterialId);
    }
  }, [selectedMaterialId]);

  // 🎹 Keyboard Shortcuts
  useEffect(() => {
    let pressedKeys = new Set();

    const handleKeyDown = (e) => {
      pressedKeys.add(e.key.toLowerCase());

      // Space → focus first Bill No input
      if (e.code === "Space") {
        e.preventDefault();
        const firstCounter = counters[0];
        if (firstCounter && billInputsRef.current[firstCounter.id]) {
          billInputsRef.current[firstCounter.id].focus();
        }
      }

      // Reset → R key
      if (e.key.toLowerCase() === "r") {
        e.preventDefault();
        resetAllInputs();
      }

      // Save Updates → S + U
      if (pressedKeys.has("s") && pressedKeys.has("u")) {
        e.preventDefault();
        saveIssuedStockData();
      }

      // Date Picker → D key
      if (e.key.toLowerCase() === "d") {
        e.preventDefault();
        if (datePickerRef.current) {
          datePickerRef.current.querySelector("input")?.focus();
          datePickerRef.current.querySelector("input")?.click();
        }
      }

      // Arrow navigation
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        moveFocus(e.key);
      }
    };

    const handleKeyUp = (e) => {
      pressedKeys.delete(e.key.toLowerCase());
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [counters, purities, stockData]);

  const moveFocus = (direction) => {
    const grid = getInputGrid();
    if (!grid.length) return;

    // Find active input position
    let rowIndex = -1,
      colIndex = -1;
    grid.forEach((row, r) => {
      row.forEach((input, c) => {
        if (input === document.activeElement) {
          rowIndex = r;
          colIndex = c;
        }
      });
    });
    if (rowIndex === -1 || colIndex === -1) return;

    let nextRow = rowIndex;
    let nextCol = colIndex;

    switch (direction) {
      case "ArrowRight":
        nextCol = (colIndex + 1) % grid[rowIndex].length;
        break;
      case "ArrowLeft":
        nextCol =
          (colIndex - 1 + grid[rowIndex].length) % grid[rowIndex].length;
        break;
      case "ArrowDown":
        if (rowIndex + 1 < grid.length) {
          nextRow = rowIndex + 1;
        }
        break;
      case "ArrowUp":
        if (rowIndex - 1 >= 0) {
          nextRow = rowIndex - 1;
        }
        break;
      default:
        break;
    }

    grid[nextRow][nextCol]?.focus();
  };

  const getInputGrid = () => {
    // Build grid: [ [billNo, purity1, purity2, ...], ... ]
    return counters.map((counter) => {
      const row = [];
      if (billInputsRef.current[counter.id]) {
        row.push(billInputsRef.current[counter.id]);
      }
      purities.forEach((purity) => {
        if (stockInputsRef.current[`${counter.id}_${purity.id}`]) {
          row.push(stockInputsRef.current[`${counter.id}_${purity.id}`]);
        }
      });
      return row;
    });
  };

  const fetchCountersAndPurities = async (materialId) => {
    try {
      const [counterRes, purityRes] = await Promise.all([
        axios.get(
          `http://localhost:8080/api/counters/by-material/${materialId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        ),
        axios.get(
          `http://localhost:8080/api/purities/by-material/${materialId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        ),
      ]);

      setCounters(counterRes.data);
      setPurities(purityRes.data);
    } catch (error) {
      console.error("Failed to load counters or purities:", error);
      toast.error("Error fetching counters or purities.");
    }
  };

  const getKey = (counterId, purityId) =>
    `${currentDate}_${counterId}_${purityId}`;

  const getSavedValue = (counterId, purityId) => {
    const key = getKey(counterId, purityId);
    return stockData[key] || "";
  };

  const updateStockValue = (counterId, purityId, value) => {
    const key = getKey(counterId, purityId);
    setStockData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const updateBillNo = (counterId, value) => {
    setBillNumbers((prev) => ({
      ...prev,
      [counterId]: value,
    }));
  };

  // 🚀 Stylish reset confirmation
  const resetAllInputs = async () => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "All inputs will be cleared!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, reset it!",
    });

    if (result.isConfirmed) {
      setStockData({});
      setBillNumbers({});
      toast.info("All inputs have been reset.");
    }
  };

  const saveIssuedStockData = async () => {
    if (!selectedMaterialId) {
      toast.warn("Please select a material.");
      return;
    }

    const payloads = [];

    for (const counter of counters) {
      const issuedDataMap = {};
      for (const purity of purities) {
        const key = getKey(counter.id, purity.id);
        const value = parseFloat(stockData[key]);
        if (!isNaN(value) && value > 0) {
          issuedDataMap[purity.name] = value;
        }
      }

      if (Object.keys(issuedDataMap).length > 0) {
        const billNo = billNumbers[counter.id];
        if (!billNo) {
          toast.error(`Please enter Bill No for counter: ${counter.name}`);
          return;
        }

        payloads.push({
          date: currentDate,
          counterId: counter.id,
          materialId: selectedMaterialId,
          billNo,
          issuedData: issuedDataMap,
        });
      }
    }

    if (payloads.length === 0) {
      toast.warn("Please enter at least one issued stock entry.");
      return;
    }

    try {
      for (const payload of payloads) {
        await axios.post(
          "http://localhost:8080/api/issued-stock/add",
          payload,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
      }
      toast.success("Issued stock data submitted successfully!");
    } catch (error) {
      console.error("Error submitting issued stock data:", error);
      toast.error("Submission failed. Please try again.");
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
    <div id="issuedStockDashboardSection" className="section">
      <ToastContainer position="bottom-right" autoClose={3000} />
      <div className="daily-sales-header">
        <div className="header-left-section">
          <button className="back-btn" onClick={() => switchView("counters")}>
            <ArrowLeft />
          </button>
          <div className="header-info">
            <h2>Issued Stock Dashboard</h2>
            <p>
              Issue inventory for date:{" "}
              {new Date(currentDate).toLocaleDateString("en-GB")}
            </p>
          </div>
        </div>

        <div className="header-actions-section">
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <div ref={datePickerRef}>
              <DatePicker
                disableFuture
                value={new Date(currentDate)}
                onChange={(newValue) => {
                  if (newValue) {
                    setCurrentDate(format(newValue, "yyyy-MM-dd"));
                  }
                }}
                slotProps={{
                  textField: {
                    className: "form-input",
                    size: "small",
                    variant: "outlined",
                    InputProps: {
                      style: { height: "40px" },
                    },
                  },
                }}
              />
            </div>
          </LocalizationProvider>

          <button className="btn btn-danger" onClick={resetAllInputs}>
            <RotateCcw /> Reset
          </button>
          <button className="btn btn-warning" onClick={saveIssuedStockData}>
            <Save /> Save Issued Stock
          </button>
        </div>
      </div>

      <div className="daily-sales-table-container">
        <table className="daily-sales-table">
          <thead>
            <tr>
              <th>Counter</th>
              <th>Bill No</th>
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
                  Please create counters and purities first.
                </td>
              </tr>
            ) : (
              <>
                {counters.map((counter) => (
                  <tr key={counter.id}>
                    <td>{counter.name}</td>
                    <td>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Enter Bill No"
                        value={billNumbers[counter.id] || ""}
                        onChange={(e) =>
                          updateBillNo(counter.id, e.target.value)
                        }
                        ref={(el) => (billInputsRef.current[counter.id] = el)}
                        required
                      />
                    </td>
                    {purities.map((purity) => (
                      <td key={purity.id}>
                        <input
                          type="number"
                          className="daily-sales-input"
                          min="0"
                          step="0.001"
                          value={getSavedValue(counter.id, purity.id)}
                          onChange={(e) =>
                            updateStockValue(
                              counter.id,
                              purity.id,
                              e.target.value
                            )
                          }
                          ref={(el) =>
                            (stockInputsRef.current[
                              `${counter.id}_${purity.id}`
                            ] = el)
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
                  <td colSpan={2}>Total</td>
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

export default IssuedStockDashboard;
