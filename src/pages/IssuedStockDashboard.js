import React, { useEffect, useState } from "react";
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

const IssuedStockDashboard = ({ switchView }) => {
  const { selectedMaterialId } = useMaterial();
  const [currentDate, setCurrentDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [stockData, setStockData] = useState({});
  const [billNumbers, setBillNumbers] = useState({});
  const [counters, setCounters] = useState([]);
  const [purities, setPurities] = useState([]);

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (selectedMaterialId) {
      fetchCountersAndPurities(selectedMaterialId);
    }
  }, [selectedMaterialId]);

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

  const resetAllInputs = () => {
    if (window.confirm("Are you sure you want to reset all entries?")) {
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
            <DatePicker
              disableFuture
              value={new Date(currentDate)}
              onChange={(newValue) => {
                if (newValue) {
                  setCurrentDate(format(newValue, "yyyy-MM-dd")); // Keep YYYY-MM-DD format
                }
              }}
              slotProps={{
                textField: {
                  className: "form-input", // 👈 your existing styling
                  size: "small",
                  variant: "outlined",
                  InputProps: {
                    style: { height: "40px" }, // Optional height to match original
                  },
                },
              }}
            />
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
