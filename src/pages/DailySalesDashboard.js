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
  const inputRefs = useRef([]); // 2D array [row][col]
  const dateInputRef = useRef(null);
  const rootRef = useRef(null);

  useEffect(() => {
    if (selectedMaterialId) {
      fetchCountersAndPurities(selectedMaterialId);
    }
  }, [selectedMaterialId]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      const code = e.code;

      // 1. Space = focus first input
      if (code === "Space" || key === " ") {
        e.preventDefault();
        if (inputRefs.current[0]?.[0]) {
          inputRefs.current[0][0].focus();
        }
      }

      // 2. Arrow navigation (row × col grid)
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(code)) {
        e.preventDefault();

        let currentRow = -1;
        let currentCol = -1;

        // Find current position
        for (let r = 0; r < counters.length; r++) {
          for (let c = 0; c < purities.length; c++) {
            if (inputRefs.current[r]?.[c] === e.target) {
              currentRow = r;
              currentCol = c;
              break;
            }
          }
        }
        if (currentRow === -1 || currentCol === -1) return;

        let newRow = currentRow;
        let newCol = currentCol;

        switch (code) {
          case "ArrowLeft":
            newCol = currentCol > 0 ? currentCol - 1 : 0; // stay in same row
            break;
          case "ArrowRight":
            newCol = currentCol < purities.length - 1 ? currentCol + 1 : 0; // wrap in same row
            break;
          case "ArrowUp":
            if (currentRow > 0) newRow = currentRow - 1;
            break;
          case "ArrowDown":
            if (currentRow < counters.length - 1) newRow = currentRow + 1;
            break;
        }

        const nextInput = inputRefs.current[newRow]?.[newCol];
        if (nextInput) {
          nextInput.focus();
          nextInput.select();
        }
      }

      // 3. Save Updates (S + U)
      if (key === "u" && window.lastKey === "s") {
        e.preventDefault();
        document.getElementById("saveDailySales")?.click();
      }
      window.lastKey = key;

      // 4. Reset (R)
      if (key === "r") {
        e.preventDefault();
        document.getElementById("resetDailySales")?.click();
      }

      // 5. Open Date Picker (D)
      if (key === "d") {
        e.preventDefault();
        if (dateInputRef.current) {
          dateInputRef.current.focus();
          dateInputRef.current.click();
        }
      }
    };

    // Attach to window so JavaFX WebView passes keys
    window.addEventListener("keydown", handleKeyDown);

    // Ensure root is focusable
    if (rootRef.current) {
      rootRef.current.setAttribute("tabindex", "0");
      rootRef.current.focus();
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [counters, purities]);

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
      setCounters(counterRes.data);
      setPurities(purityRes.data);
      inputRefs.current = [];
    } catch (error) {
      toast.error("Error fetching counters or purities.");
    }
  };

  const getKey = (counterId, purityId) =>
    `${currentDate}_${counterId}_${purityId}`;

  const getSavedValue = (counterId, purityId) => {
    const key = getKey(counterId, purityId);
    return salesData[key] || "";
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
        Swal.fire("Reset!", "All inputs have been cleared.", "success");
      }
    });
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
        const value = parseFloat(salesData[key]);
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
      for (const payload of salesPayloads) {
        await axios.post("http://localhost:8080/api/daily-sales/add", payload, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
      }
      toast.success("Sales data submitted successfully!");
    } catch (error) {
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
    <div
      id="dailySalesDashboardSection"
      className="section"
      ref={rootRef}
      tabIndex={0} // focusable
    >
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
                  inputRef: dateInputRef,
                  InputProps: { style: { height: "40px" } },
                },
              }}
            />
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
