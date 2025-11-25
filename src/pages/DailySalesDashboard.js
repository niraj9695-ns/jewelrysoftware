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

  // Local cell values: "yyyy-MM-dd_counterId_purityId" -> string
  const [salesData, setSalesData] = useState({});

  const [counters, setCounters] = useState([]);
  const [purities, setPurities] = useState([]);

  // existingEntriesByKey: "counterId_purityId" -> [entries]
  const [existingEntriesByKey, setExistingEntriesByKey] = useState({});

  const token = localStorage.getItem("token");

  const inputRefs = useRef([]);
  const datePickerRef = useRef(null);

  // Fetch counters & purities when material selected
  useEffect(() => {
    if (selectedMaterialId) {
      fetchCountersAndPurities(selectedMaterialId);
    } else {
      setCounters([]);
      setPurities([]);
    }
  }, [selectedMaterialId]);

  // When material/date changes, fetch existing sales
  useEffect(() => {
    if (selectedMaterialId && currentDate) {
      fetchExistingSales(selectedMaterialId, currentDate);
    } else {
      setExistingEntriesByKey({});
    }
  }, [selectedMaterialId, currentDate]);

  // If purities load after entries, populate the local salesData from server entries
  useEffect(() => {
    if (purities.length > 0 && Object.keys(existingEntriesByKey).length > 0) {
      setSalesData((prev) => {
        const next = { ...prev };
        Object.entries(existingEntriesByKey).forEach(([key, arr]) => {
          const [counterId, purityId] = key.split("_");
          const fullKey = `${currentDate}_${counterId}_${purityId}`;
          if (arr[0] && typeof arr[0].soldWeight !== "undefined") {
            next[fullKey] = String(arr[0].soldWeight);
          }
        });
        return next;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purities, existingEntriesByKey]);

  // Keyboard shortcuts & arrow navigation
  useEffect(() => {
    const pressedKeys = new Set();

    const handleKeyDown = (e) => {
      const key = e.key?.toLowerCase?.();
      pressedKeys.add(key);

      if (e.code === "Space" || key === " ") {
        e.preventDefault();
        const grid = getInputGrid();
        if (grid[0]?.[0]) {
          grid[0][0].focus();
          grid[0][0].select?.();
        }
      }
      if (key === "r") {
        e.preventDefault();
        resetAllInputs();
      }
      if (pressedKeys.has("s") && pressedKeys.has("u")) {
        e.preventDefault();
        saveSalesData();
      }
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
      if (["arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
        e.preventDefault();
        moveFocus(e.key);
      }
    };

    const handleKeyUp = (e) => {
      pressedKeys.delete(e.key?.toLowerCase?.());
    };

    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("keyup", handleKeyUp, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("keyup", handleKeyUp, true);
    };
  }, [counters, purities, salesData, currentDate, existingEntriesByKey]);

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
        nextCol = (colIndex + 1) % grid[rowIndex].length;
        break;
      case "arrowleft":
        nextCol =
          (colIndex - 1 + grid[rowIndex].length) % grid[rowIndex].length;
        break;
      case "arrowdown":
        if (rowIndex + 1 < grid.length) {
          nextRow = rowIndex + 1;
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

  // --- API calls ---

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
      inputRefs.current = [];
    } catch (error) {
      toast.error("Error fetching counters or purities.");
    }
  };

  // Convert server array response (flat per-purity entries) into map keyed by counter_purity
  const fetchExistingSales = async (materialId, dateStr) => {
    try {
      const res = await axios.get(
        `http://localhost:8080/api/daily-sales/by-material-date`,
        {
          params: { materialId, date: dateStr },
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const entries = Array.isArray(res.data) ? res.data : [];

      const byKey = {};
      entries.forEach((entry) => {
        const counterId = entry.counter?.id ?? (entry.counterId || null);
        const purityId = entry.purity?.id ?? (entry.purityId || null);
        if (counterId == null || purityId == null) return;
        const key = `${counterId}_${purityId}`;
        byKey[key] = byKey[key] || [];
        byKey[key].push(entry);
      });

      setExistingEntriesByKey(byKey);

      // populate local salesData with server soldWeight values (if purities known)
      setSalesData((prev) => {
        const next = { ...prev };
        Object.entries(byKey).forEach(([key, arr]) => {
          const [counterId, purityId] = key.split("_");
          const fullKey = `${dateStr}_${counterId}_${purityId}`;
          if (arr[0] && typeof arr[0].soldWeight !== "undefined") {
            next[fullKey] = String(arr[0].soldWeight);
          }
        });
        return next;
      });
    } catch (error) {
      // empty or error -> clear maps
      setExistingEntriesByKey({});
    }
  };

  // Helpers to manage local state keys
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
        setSalesData((prev) => {
          const next = { ...prev };
          const prefix = `${currentDate}_`;
          Object.keys(prev).forEach((k) => {
            if (k.startsWith(prefix)) delete next[k];
          });
          return next;
        });
        setExistingEntriesByKey({});
        const firstInput = inputRefs.current?.[0]?.[0];
        if (firstInput) {
          firstInput.focus();
          firstInput.select?.();
        }
        Swal.fire("Reset!", "All inputs have been cleared.", "success");
      }
    });
  };

  const clearCurrentDateEntries = () => {
    setSalesData((prev) => {
      const next = { ...prev };
      const prefix = `${currentDate}_`;
      Object.keys(prev).forEach((k) => {
        if (k.startsWith(prefix)) delete next[k];
      });
      return next;
    });
    const firstInput = inputRefs.current?.[0]?.[0];
    if (firstInput) {
      firstInput.focus();
      firstInput.select?.();
    }
  };

  // Save logic: build per-counter salesData map { purityName: value } and call update or create endpoints.
  const saveSalesData = async () => {
    console.log("=== SAVE START ===");
    console.log("currentDate:", currentDate);
    console.log(
      "existingEntriesByKey:",
      JSON.parse(JSON.stringify(existingEntriesByKey))
    );
    console.log("counters:", counters);
    console.log("purities:", purities);

    if (!selectedMaterialId) {
      toast.warn("Please select a material before saving.");
      return;
    }

    // 1) detect duplicates per counter_purity
    const duplicateKeys = Object.entries(existingEntriesByKey)
      .filter(([, arr]) => arr.length > 1)
      .map(([key, arr]) => ({ key, entries: arr }));

    if (duplicateKeys.length > 0) {
      const messages = duplicateKeys
        .map((d) => {
          const [counterId, purityId] = d.key.split("_");
          const counterName =
            d.entries[0]?.counter?.name ?? `Counter ${counterId}`;
          const purityName = d.entries[0]?.purity?.name ?? purityId;
          return `${counterName} / ${purityName} — ${d.entries.length} records`;
        })
        .join("\n");

      await Swal.fire({
        icon: "error",
        title: "Duplicate entries detected",
        html:
          `<p>The server has multiple entries for the same counter + purity on this date.</p>` +
          `<pre style="text-align:left; white-space:pre-wrap;">${messages}</pre>` +
          `<p>Please remove duplicates in the backend or via admin tools before saving.</p>`,
      });
      return;
    }

    // 2) Build payloads per counter
    const toCreate = []; // POST /add payloads (per counter)
    const toUpdate = []; // PUT /update payloads (per counter)

    counters.forEach((counter) => {
      // Build salesData map for this counter using purity.name keys
      const salesDataMap = {};
      purities.forEach((purity) => {
        const localKey = getKey(counter.id, purity.id);
        const raw = salesData[localKey];
        const value = parseFloat(raw);
        if (!isNaN(value) && value > 0) {
          // use purity.name as key (server expects purity name -> value map)
          salesDataMap[purity.name] = value;
        }
      });

      if (Object.keys(salesDataMap).length > 0) {
        // NEW: Determine if server already has any entry for THIS counter (by checking existingEntriesByKey for keys that start with `${counter.id}_`)
        const counterHasServerEntry = purities.some((p) => {
          const smallKey = `${counter.id}_${p.id}`;
          return (
            Array.isArray(existingEntriesByKey[smallKey]) &&
            existingEntriesByKey[smallKey].length > 0
          );
        });

        if (counterHasServerEntry) {
          toUpdate.push({
            materialId: selectedMaterialId,
            counterId: counter.id,
            date: currentDate,
            salesData: salesDataMap,
          });
        } else {
          toCreate.push({
            materialId: selectedMaterialId,
            counterId: counter.id,
            date: currentDate,
            salesData: salesDataMap,
          });
        }
      }
    });

    if (toCreate.length === 0 && toUpdate.length === 0) {
      toast.warn("Please enter at least one value before saving.");
      return;
    }

    try {
      if (toUpdate.length > 0) {
        const proceed = await Swal.fire({
          title: "Update existing counters?",
          text: `We will update ${toUpdate.length} counter(s) which already have entries for this date. Proceed?`,
          icon: "question",
          showCancelButton: true,
          confirmButtonText: "Yes, update",
        });
        if (!proceed.isConfirmed) return;
      }

      Swal.fire({
        title: "Submitting...",
        text: "Please wait while the sales data is saved.",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      // Perform updates: PUT /api/daily-sales/update with body { materialId, counterId, date, salesData }
      for (const up of toUpdate) {
        await axios.put("http://localhost:8080/api/daily-sales/update", up, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
      }

      // Perform creates: POST /api/daily-sales/add with same body shape
      for (const p of toCreate) {
        await axios.post("http://localhost:8080/api/daily-sales/add", p, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
      }

      Swal.close();
      toast.success("Sales data submitted successfully!");

      // Refresh server-side entries for this date to reflect saved state
      await fetchExistingSales(selectedMaterialId, currentDate);

      // Clear only the entries for the current date locally
      clearCurrentDateEntries();
    } catch (error) {
      Swal.close();
      console.error("Save failed:", error);
      if (error.response && error.response.data) {
        const serverMsg =
          typeof error.response.data === "string"
            ? error.response.data
            : JSON.stringify(error.response.data);
        toast.error("Server error: " + serverMsg);
      } else {
        toast.error("Failed to submit sales data.");
      }
    }
  };

  // Totals
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
                    <td>
                      {counter.name}
                      {purities.some((p) => {
                        const smallKey = `${counter.id}_${p.id}`;
                        return (
                          Array.isArray(existingEntriesByKey[smallKey]) &&
                          existingEntriesByKey[smallKey].length > 0
                        );
                      }) ? (
                        <div style={{ fontSize: 12, color: "#b93b3b" }}>
                          Existing entry found — saving will update it
                        </div>
                      ) : null}
                    </td>

                    {purities.map((purity, colIndex) => {
                      const smallKey = `${counter.id}_${purity.id}`;
                      const duplicateCount =
                        existingEntriesByKey[smallKey]?.length ?? 0;
                      return (
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
                          {duplicateCount > 1 ? (
                            <div style={{ fontSize: 11, color: "#a00" }}>
                              {duplicateCount} duplicate(s) on server
                            </div>
                          ) : null}
                        </td>
                      );
                    })}
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
