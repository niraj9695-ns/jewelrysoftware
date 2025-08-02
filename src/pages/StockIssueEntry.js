import React, { useEffect, useState } from "react";
import axios from "axios";
import "../assets/styles/forms.css";
import "../assets/styles/dashboard.css";
import { Save, X } from "lucide-react";
import { useMaterial } from "../components/MaterialContext"; // ✅ Correct custom hook
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import TextField from "@mui/material/TextField";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const StockIssueEntry = () => {
  const [counters, setCounters] = useState([]);
  const [purities, setPurities] = useState([]);
  const [counterId, setCounterId] = useState("");
  const [entryDate, setEntryDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [entries, setEntries] = useState({});
  const [billNo, setBillNo] = useState("");

  const { selectedMaterialId } = useMaterial(); // ✅ use custom hook
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (selectedMaterialId) {
      fetchCounters(selectedMaterialId);
      fetchPurities(selectedMaterialId);
    }
  }, [selectedMaterialId]);

  const fetchCounters = async (materialId) => {
    try {
      const res = await axios.get(
        `http://localhost:8080/api/counters/by-material/${materialId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setCounters(res.data);
    } catch (error) {
      console.error("Error fetching counters:", error);
    }
  };

  const fetchPurities = async (materialId) => {
    try {
      const res = await axios.get(
        `http://localhost:8080/api/purities/by-material/${materialId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setPurities(res.data);
    } catch (error) {
      console.error("Error fetching purities:", error);
    }
  };

  const handleInputChange = (name, value) => {
    setEntries((prev) => ({ ...prev, [name]: parseFloat(value) || 0 }));
  };

  const total = Object.values(entries).reduce((sum, val) => sum + val, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!counterId || !entryDate || !billNo || !selectedMaterialId) {
      toast.error("Please fill all required fields.");
      return;
    }

    const hasEntries = Object.values(entries).some((value) => value > 0);
    if (!hasEntries) {
      toast.error("Please enter at least one purity weight.");
      return;
    }

    const payload = {
      date: entryDate,
      counterId: parseInt(counterId),
      materialId: selectedMaterialId, // ✅ Include material ID
      billNo,
      issuedData: entries,
    };

    try {
      await axios.post("http://localhost:8080/api/issued-stock/add", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Stock entry saved successfully!");
      setEntries({});
      setBillNo("");
      setEntryDate(new Date().toISOString().split("T")[0]);
    } catch (error) {
      console.error("Error submitting stock entry:", error);
      toast.error("An error occurred while submitting the stock entry.");
    }
  };

  const handleClear = () => {
    setEntries({});
    setBillNo("");
  };

  return (
    <div className="view">
      <div className="section">
        <div className="section-header">
          <div>
            <h2>Stock Issue Entry</h2>
            <p>Record stock issued to counters by purity</p>
          </div>
        </div>
        <form className="daily-entry-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="entryCounterSelect">Counter</label>
              <select
                id="entryCounterSelect"
                className="form-select"
                required
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
              <label htmlFor="entryDate">Date</label>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  disableFuture
                  value={entryDate ? new Date(entryDate) : null}
                  onChange={(newValue) => {
                    if (newValue) {
                      setEntryDate(newValue.toISOString().split("T")[0]); // save in yyyy-mm-dd
                    }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      required
                      size="small"
                      id="entryDate"
                      sx={{ minWidth: "200px" }}
                    />
                  )}
                />
              </LocalizationProvider>
            </div>

            <div className="form-group">
              <label htmlFor="billNo">Bill No</label>
              <input
                type="text"
                id="billNo"
                placeholder="Enter bill number"
                className="form-input"
                required
                value={billNo}
                onChange={(e) => setBillNo(e.target.value)}
              />
            </div>
          </div>

          <h3>Stock Entries by Purity</h3>

          <div className="purity-grid" id="purityInputs">
            {purities.length === 0 ? (
              <p>No purities found for selected material.</p>
            ) : (
              purities.map((p) => (
                <div key={p.id} className="purity-input-group">
                  <label htmlFor={`purity_${p.id}`}>{p.name}</label>
                  <input
                    type="number"
                    id={`purity_${p.id}`}
                    min="0"
                    step="0.001"
                    placeholder="0.000"
                    className="purity-input"
                    value={entries[p.name] || ""}
                    onChange={(e) => handleInputChange(p.name, e.target.value)}
                  />
                </div>
              ))
            )}
          </div>

          <div className="form-summary">
            <strong>Total:</strong> {total.toFixed(3)}
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              <Save className="icon" />
              Save Entry
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClear}
            >
              <X className="icon" />
              Clear
            </button>
          </div>
        </form>
      </div>

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        pauseOnHover
        draggable
      />
    </div>
  );
};

export default StockIssueEntry;
