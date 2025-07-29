import React, { useEffect, useState } from "react";
import axios from "axios";
import "../assets/styles/dashboard.css";
import "../assets/styles/forms.css";
import { Edit, Trash, Plus } from "lucide-react";
import { useMaterial } from "../components/MaterialContext";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const GoldPurities = () => {
  const [purities, setPurities] = useState([]);
  const [name, setName] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const { selectedMaterialId } = useMaterial();
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (selectedMaterialId) {
      fetchPurities();
    }
  }, [selectedMaterialId]);

  const fetchPurities = async () => {
    try {
      const res = await axios.get(
        `http://localhost:8080/api/purities/by-material/${selectedMaterialId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setPurities(res.data);
    } catch (error) {
      console.error("Error fetching purities:", error);
    }
  };

  const openModal = (purity = null) => {
    if (purity) {
      setEditingId(purity.id);
      setName(purity.name);
    } else {
      setEditingId(null);
      setName("");
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setName("");
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMaterialId) {
      alert("Please select a material before adding purity.");
      return;
    }

    try {
      if (editingId) {
        // ✅ PUT request with purityId as query param, body without purityId
        await axios.put(
          `http://localhost:8080/api/purities/update?purityId=${editingId}`,
          {
            name,
            materialId: selectedMaterialId,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        toast.success("Purity updated successfully!");
      } else {
        // POST request to add new
        await axios.post(
          "http://localhost:8080/api/purities/add",
          {
            name,
            materialId: selectedMaterialId,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        toast.success("Purity added successfully!");
      }

      fetchPurities();
      closeModal();
    } catch (error) {
      console.error("Error saving/updating purity:", error);
      toast.error("Something went wrong.");
    }
  };

  const deletePurity = async (id) => {
    if (!window.confirm("Are you sure you want to delete this purity?")) return;

    try {
      await axios.delete(`http://localhost:8080/api/purities/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      toast.success("Purity deleted successfully!");
      fetchPurities();
    } catch (error) {
      console.error("Error deleting purity:", error);
      toast.error("Failed to delete purity.");
    }
  };

  return (
    <div className="view">
      <ToastContainer />
      <div className="section">
        <div className="section-header">
          <div>
            <h2>Gold Purities</h2>
            <p>Manage gold purity types for all counters</p>
          </div>
          <button className="btn btn-success" onClick={() => openModal()}>
            <Plus size={16} /> Add Purity
          </button>
        </div>

        <div className="purities-grid">
          {purities.length === 0 ? (
            <div className="no-data">
              <h3>No Purities Found</h3>
              <p>Click "Add Purity" to create your first purity type</p>
            </div>
          ) : (
            purities.map((purity) => (
              <div className="purity-card" key={purity.id}>
                <div className="purity-header">
                  <div className="purity-name">{purity.name}</div>
                  <div className="purity-actions">
                    <button
                      className="action-btn edit"
                      onClick={() => openModal(purity)}
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      className="action-btn delete"
                      onClick={() => deletePurity(purity.id)}
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                </div>
                <div className="purity-status active">Active</div>
              </div>
            ))
          )}
        </div>
      </div>

      {modalOpen && (
        <div className="modal show">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingId ? "Edit Purity" : "Add Purity"}</h3>
              <span className="close" onClick={closeModal}>
                ✕
              </span>
            </div>
            <form className="modal-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Purity Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
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

export default GoldPurities;
