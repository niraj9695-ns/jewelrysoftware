import React, { useEffect, useState } from "react";
import axios from "axios";
import "../assets/styles/dashboard.css";
import "../assets/styles/forms.css";
import "../assets/styles/main.css";

const Counters = () => {
  const [counters, setCounters] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const apiBase = "http://localhost:8080/api/counters";
  const token = localStorage.getItem("token"); // 🔐 get token from localStorage

  // Load counters on component mount
  useEffect(() => {
    fetchCounters();
  }, []);

  const fetchCounters = async () => {
    try {
      const res = await axios.get(apiBase, {
        headers: {
          Authorization: `Bearer ${token}`, // ✅ pass token here
        },
      });
      setCounters(res.data);
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

  const closeModal = () => {
    setModalOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingId) {
        alert("Update not implemented.");
      } else {
        await axios.post(
          `${apiBase}/create?name=${encodeURIComponent(name)}`,
          {}, // No request body needed
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      }
      fetchCounters();
      closeModal();
    } catch (error) {
      console.error("Error saving counter:", error);
    }
  };

  return (
    <div className="view">
      <div className="section">
        <div className="section-header">
          <div>
            <h2>Counter List</h2>
            <p>{counters.length}/8 counters created</p>
          </div>
          <button className="btn btn-success" onClick={() => openModal()}>
            <i data-lucide="plus"></i> Add Counter
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
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {counters.map((counter) => (
                  <tr key={counter.id}>
                    <td>{counter.name}</td>
                    <td>
                      <button
                        className="btn btn-secondary"
                        onClick={() => openModal(counter)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
                {counters.length < 8 && (
                  <tr>
                    <td colSpan="2" className="add-counter-row">
                      <button
                        className="add-counter-btn"
                        onClick={() => openModal()}
                      >
                        <i data-lucide="plus"></i> Add Another Counter
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
                ></textarea>
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary cancel-btn"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
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
