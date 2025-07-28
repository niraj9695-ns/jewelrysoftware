import React, { useEffect, useState } from "react";
import axios from "axios";
import { Eye, Edit2, Trash2, Plus, BarChart2 } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { useMaterial } from "../components/MaterialContext";
import "../assets/styles/dashboard.css";
import "../assets/styles/forms.css";
import "../assets/styles/main.css";

const Counters = ({ onViewSales, onViewStock, onViewSummary }) => {
  const { selectedMaterialId } = useMaterial();
  const [counters, setCounters] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (selectedMaterialId) {
      fetchCounters(selectedMaterialId);
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

      const countersWithCounts = await Promise.all(
        res.data.map(async (counter) => {
          try {
            const [salesRes, stockRes] = await Promise.all([
              axios.get(
                "http://localhost:8080/api/daily-sales/by-material-counter",
                {
                  headers: { Authorization: `Bearer ${token}` },
                  params: {
                    materialId,
                    counterId: counter.id,
                  },
                }
              ),
              axios.get(
                "http://localhost:8080/api/issued-stock/by-material-counter",
                {
                  headers: { Authorization: `Bearer ${token}` },
                  params: {
                    materialId,
                    counterId: counter.id,
                  },
                }
              ),
            ]);

            return {
              ...counter,
              salesCount: salesRes.data?.length ?? 0,
              stockIssuedCount: stockRes.data?.length ?? 0,
            };
          } catch (error) {
            console.error(
              `Error fetching counts for counter ${counter.id}:`,
              error
            );
            return {
              ...counter,
              salesCount: 0,
              stockIssuedCount: 0,
            };
          }
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
      if (!selectedMaterialId) {
        alert("Please select a material before proceeding.");
        return;
      }

      const payload = {
        name,
        materialId: selectedMaterialId,
        description,
      };

      if (editingId) {
        // Edit counter
        await axios.put(`http://localhost:8080/api/counters/update`, payload, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          params: {
            counterId: editingId,
          },
        });
        toast.success("Counter updated successfully!");
      } else {
        // Add new counter
        await axios.post("http://localhost:8080/api/counters/add", payload, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        toast.success("Counter added successfully!");
      }

      fetchCounters(selectedMaterialId);
      closeModal();
    } catch (error) {
      console.error("Error saving counter:", error);
      toast.error("Failed to save counter. Please try again.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this counter?"))
      return;
    try {
      await axios.delete(`http://localhost:8080/api/counters/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchCounters(selectedMaterialId);
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
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h2>Counter List</h2>
            <p>{counters.length}/8 counters created</p>
          </div>
          <button
            className="add-counter-btn"
            onClick={() => openModal()}
            type="button"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
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
                        onClick={() =>
                          counter.salesCount > 0
                            ? onViewSales(counter)
                            : alert("No sales entries added yet")
                        }
                        type="button"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                    <td>
                      <button
                        className="btn-icon"
                        title="View Stock Issued Entries"
                        onClick={() =>
                          counter.stockIssuedCount > 0
                            ? onViewStock(counter)
                            : alert("No stock entries added yet")
                        }
                        type="button"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                    <td
                      className="counter-actions-cell"
                      style={{
                        display: "flex",
                        gap: "0.5rem",
                        alignItems: "center",
                      }}
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
              {/* <div className="form-group">
                <label>Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div> */}
              <div className="form-actions">
                <button
                  type="button"
                  className="btn-clear"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingId ? "Update" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ToastContainer position="bottom-right" autoClose={3000} />
    </div>
  );
};

export default Counters;
