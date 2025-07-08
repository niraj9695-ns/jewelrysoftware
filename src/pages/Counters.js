import React, { useEffect, useState } from "react";
import axios from "axios";
import { Eye, Edit2, Trash2, Plus, BarChart2 } from "lucide-react"; // Added BarChart2 icon for summary
import "../assets/styles/dashboard.css";
import "../assets/styles/forms.css";
import "../assets/styles/main.css";

const Counters = ({ onViewSales, onViewStock, onViewSummary }) => {
  const [counters, setCounters] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const apiBase = "http://localhost:8080/api/counters";
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchCounters();
  }, []);

  const fetchCounters = async () => {
    try {
      const res = await axios.get(apiBase, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const countersWithCounts = await Promise.all(
        res.data.map(async (counter) => {
          const [salesRes, stockRes] = await Promise.all([
            axios.get(`http://localhost:8080/api/sales/by-counter/${counter.id}`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
            axios.get(`http://localhost:8080/api/issued-stock/by-counter/${counter.id}`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
          ]);

          return {
            ...counter,
            salesCount: salesRes.data?.length ?? 0,
            stockIssuedCount: stockRes.data?.length ?? 0,
          };
        })
      );

      setCounters(countersWithCounts);
    } catch (error) {
      console.error("Error fetching counters:", error);
    }
  };

  const openModal = (counter = null) => {
    if (counter) {
      setEditingId(counter.id);
      setName(counter.name);
      setDescription(counter.description || "");
    } else {
      setEditingId(null);
      setName("");
      setDescription("");
    }
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        alert("Editing not supported in backend yet.");
        return;
      } else {
        await axios.post(
          `${apiBase}/create?name=${encodeURIComponent(name)}`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      fetchCounters();
      closeModal();
    } catch (error) {
      console.error("Error saving counter:", error);
      alert("Failed to save counter. Please try again.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this counter?")) return;
    try {
      await axios.delete(`${apiBase}/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchCounters();
    } catch (error) {
      console.error("Error deleting counter:", error);
      alert("Failed to delete counter. Please try again.");
    }
  };

  return (
    <div className="view">
      <div className="section">
        <div
          className="section-header"
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          <div>
            <h2>Counter List</h2>
            <p>{counters.length}/8 counters created</p>
          </div>
          <button
            className="add-counter-btn"
            onClick={() => openModal()}
            type="button"
            style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
          >
            <Plus size={16} /> Add Counter
          </button>
        </div>

        <div className="counters-grid">
          {counters.length === 0 ? (
            <div className="no-data">
              <h3>No Counters Found</h3>
              <p>Click "Add Counter" to create your first counter</p>
            </div>
          ) : (
            <table className="counters-table">
              <thead>
                <tr>
                  <th>COUNTER NAME</th>
                  <th>SALES ENTRIES</th>
                  <th>STOCK ISSUED ENTRIES</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {counters.map((counter) => (
                  <tr key={counter.id}>
                    <td>{counter.name}</td>
                    <td>
                      <button
                        className="btn-icon"
                        title="View Sales Entries"
                        onClick={() => {
                          if (counter.salesCount > 0) {
                            onViewSales(counter);
                          } else {
                            alert("No sales entries added yet");
                          }
                        }}
                        type="button"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                    <td>
                      <button
                        className="btn-icon"
                        title="View Stock Issued Entries"
                        onClick={() => {
                          if (counter.stockIssuedCount > 0) {
                            onViewStock(counter);
                          } else {
                            alert("No stock entries added yet");
                          }
                        }}
                        type="button"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                    <td
                      className="counter-actions-cell"
                      style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
                    >
                      <button
                        className="action-btn edit"
                        title="Edit Counter"
                        onClick={() => openModal(counter)}
                        type="button"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        className="action-btn delete"
                        title="Delete Counter"
                        onClick={() => handleDelete(counter.id)}
                        type="button"
                      >
                        <Trash2 size={14} />
                      </button>
                      <button
                        className="action-btn summary"
                        title="View Counter Summary"
                        onClick={() => onViewSummary(counter)}
                        type="button"
                      >
                        <BarChart2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {counters.length < 8 && (
                  <tr>
                    <td colSpan="4" className="add-counter-row">
                      <button
                        className="add-counter-btn"
                        onClick={() => openModal()}
                        type="button"
                      >
                        <Plus size={16} /> Add Another Counter
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modalOpen && (
        <div className="modal show">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingId ? "Edit Counter" : "Add Counter"}</h3>
              <span className="close" onClick={closeModal}>
                ✕
              </span>
            </div>
            <form className="modal-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Counter Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn-clear" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Counters;
