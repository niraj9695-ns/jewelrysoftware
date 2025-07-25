import React, { useEffect, useState } from "react";
import axios from "axios";
import { useMaterial } from "../components/MaterialContext";
import "../assets/styles/forms.css";
import "../assets/styles/dashboard.css";

const DailyEntry = () => {
  const { selectedMaterialId } = useMaterial(); // ✅ Context hook
  const [counters, setCounters] = useState([]);
  const [purities, setPurities] = useState([]);
  const [counterId, setCounterId] = useState("");
  const [entryType, setEntryType] = useState("sales");
  const [entryDate, setEntryDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [entries, setEntries] = useState({});
  const [billNo, setBillNo] = useState("");

  const token = localStorage.getItem("token");

  useEffect(() => {
    console.log("Selected Material ID:", selectedMaterialId);
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

    if (!counterId || !entryDate || !selectedMaterialId) {
      alert("Please fill all required fields.");
      return;
    }

    const hasEntries = Object.values(entries).some((value) => value > 0);
    if (!hasEntries) {
      alert("Please enter at least one purity weight.");
      return;
    }

    const isStock = entryType === "stock";

    const payload = {
      counterId,
      date: entryDate,
      ...(isStock
        ? {
            materialId: selectedMaterialId,
            billNo,
            issuedData: entries,
          }
        : {
            salesData: entries,
          }),
    };

    const url = isStock
      ? "http://localhost:8080/api/issued-stock/add"
      : "http://localhost:8080/api/sales/submit";

    try {
      await axios.post(url, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert(`${isStock ? "Stock" : "Sales"} entry saved successfully!`);
      setEntries({});
      setEntryDate(new Date().toISOString().split("T")[0]);
      setBillNo("");
    } catch (error) {
      console.error("Error submitting entry:", error);
      alert("An error occurred while submitting the entry.");
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
            <h2>Daily Entry</h2>
            <p>Record daily sales and stock entries for counters</p>
          </div>
        </div>
        {!selectedMaterialId ? (
          <div style={{ padding: "1rem", color: "red" }}>
            Please select a material to continue.
          </div>
        ) : (
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
                <label htmlFor="entryTypeSelect">Entry Type</label>
                <select
                  id="entryTypeSelect"
                  className="entry-type-select"
                  value={entryType}
                  onChange={(e) => setEntryType(e.target.value)}
                >
                  <option value="sales">Sales</option>
                  <option value="stock">Stock Issued</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group date-field">
                <label htmlFor="entryDate">Date</label>
                <input
                  type="date"
                  id="entryDate"
                  className="form-input"
                  required
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                />
              </div>
              {entryType === "stock" && (
                <div className="form-group">
                  <label htmlFor="billNo">Bill No</label>
                  <input
                    type="text"
                    id="billNo"
                    placeholder="Enter bill number"
                    className="form-input"
                    value={billNo}
                    onChange={(e) => setBillNo(e.target.value)}
                  />
                </div>
              )}
            </div>

            <h3>
              {entryType === "sales"
                ? "Sales Entries"
                : "Stock Entries by Purity"}
            </h3>

            <div className="purity-grid" id="purityInputs">
              {purities.map((p) => (
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
              ))}
            </div>

            <div className="form-summary">
              <strong>Total:</strong> {total.toFixed(3)}
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                <i className="lucide lucide-save"></i> Save Entry
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleClear}
              >
                <i className="lucide lucide-x"></i> Clear
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default DailyEntry;
