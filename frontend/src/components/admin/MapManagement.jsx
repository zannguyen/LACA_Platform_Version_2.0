import React, { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import {
  getAllLocations,
  createLocation,
  updateLocation,
  deleteLocation,
} from "../../api/admin.api";
import "leaflet/dist/leaflet.css";
import "./MapManagement.css";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const DEFAULT_CENTER = [10.8231, 106.6297]; // HCM

const MapManagement = () => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  const [filter, setFilter] = useState("all"); // all | active | inactive

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    latitude: "",
    longitude: "",
    category: "other",
    isActive: true,
  });

  const isActiveParam = useMemo(() => {
    if (filter === "active") return true;
    if (filter === "inactive") return false;
    return undefined;
  }, [filter]);

  useEffect(() => {
    fetchLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const fetchLocations = async () => {
    setLoading(true);
    setErrMsg("");

    const res = await getAllLocations({ isActive: isActiveParam });

    if (!res.success) {
      setLocations([]);
      setErrMsg(res.error?.message || "Failed to load locations");
      setLoading(false);
      return;
    }

    setLocations(res.data?.locations || []);
    setLoading(false);
  };

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddClick = () => {
    setEditingLocation(null);
    setFormData({
      name: "",
      address: "",
      latitude: "",
      longitude: "",
      category: "other",
      isActive: true,
    });
    setShowAddModal(true);
  };

  const handleEditClick = (location) => {
    setEditingLocation(location);
    setFormData({
      name: location.name || "",
      address: location.address || "",
      latitude: String(location.latitude ?? ""),
      longitude: String(location.longitude ?? ""),
      category: location.category || "other",
      isActive: location.isActive ?? true,
    });
    setShowAddModal(true);
  };

  const handleSubmit = async () => {
    const lat = Number(formData.latitude);
    const lng = Number(formData.longitude);

    if (
      !formData.name ||
      !formData.address ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      window.alert("Please fill Name/Address/Latitude/Longitude correctly.");
      return;
    }

    const payload = {
      name: formData.name.trim(),
      address: formData.address.trim(),
      latitude: lat,
      longitude: lng,
      category: formData.category,
      isActive: !!formData.isActive,
    };

    let res;
    if (editingLocation) {
      res = await updateLocation(editingLocation.id, payload);
    } else {
      res = await createLocation(payload);
    }

    if (!res.success) {
      window.alert(res.error?.message || "Save failed");
      return;
    }

    setShowAddModal(false);
    setEditingLocation(null);
    await fetchLocations();
  };

  const handleDelete = async (locationId) => {
    if (!window.confirm("Are you sure you want to delete this location?"))
      return;

    const res = await deleteLocation(locationId);
    if (!res.success) {
      window.alert(res.error?.message || "Delete failed");
      return;
    }

    setLocations((prev) => prev.filter((l) => l.id !== locationId));
  };

  if (loading) {
    return (
      <div className="map-management">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="map-management">
      <div className="page-header">
        <h1>Map Management</h1>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </select>

          <button className="btn-add" onClick={handleAddClick}>
            + Add Location
          </button>
        </div>
      </div>

      {errMsg && (
        <div style={{ marginBottom: 12, color: "crimson" }}>
          <b>Error:</b> {errMsg}
        </div>
      )}

      {/* Map */}
      <div className="map-container">
        <MapContainer center={DEFAULT_CENTER} zoom={13} className="leaflet-map">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {locations.map((location) => (
            <Marker
              key={location.id}
              position={[location.latitude, location.longitude]}
            >
              <Popup>
                <div className="popup-content">
                  <strong>{location.name}</strong>
                  <p>{location.address}</p>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>
                    {location.latitude.toFixed(6)},{" "}
                    {location.longitude.toFixed(6)}
                  </div>
                  <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                    <button onClick={() => handleEditClick(location)}>
                      Edit
                    </button>
                    <button onClick={() => handleDelete(location.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Location List */}
      <div className="location-list">
        <h2>All Locations ({locations.length})</h2>

        <div className="location-items">
          {locations.map((location) => (
            <div key={location.id} className="location-item">
              <div className="location-info">
                <div className="location-name">
                  {location.name}{" "}
                  <span style={{ fontSize: 12, opacity: 0.7 }}>
                    ({location.isActive ? "active" : "inactive"})
                  </span>
                </div>
                <div className="location-address">{location.address}</div>
                <div className="location-coords">
                  {location.latitude.toFixed(4)},{" "}
                  {location.longitude.toFixed(4)}
                </div>
              </div>

              <div className="location-actions">
                <button
                  className="btn-edit"
                  onClick={() => handleEditClick(location)}
                >
                  Edit
                </button>
                <button
                  className="btn-delete"
                  onClick={() => handleDelete(location.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}

          {!locations.length && !errMsg && (
            <div style={{ padding: 16, opacity: 0.7 }}>No locations found.</div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{editingLocation ? "Edit Location" : "Add New Location"}</h3>

            <div className="form-group">
              <label>Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleFormChange("name", e.target.value)}
                placeholder="Location name"
              />
            </div>

            <div className="form-group">
              <label>Address *</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleFormChange("address", e.target.value)}
                placeholder="Full address"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Latitude *</label>
                <input
                  type="number"
                  step="0.000001"
                  value={formData.latitude}
                  onChange={(e) => handleFormChange("latitude", e.target.value)}
                  placeholder="10.8231"
                />
              </div>
              <div className="form-group">
                <label>Longitude *</label>
                <input
                  type="number"
                  step="0.000001"
                  value={formData.longitude}
                  onChange={(e) =>
                    handleFormChange("longitude", e.target.value)
                  }
                  placeholder="106.6297"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Category</label>
              <select
                value={formData.category}
                onChange={(e) => handleFormChange("category", e.target.value)}
              >
                <option value="cafe">cafe</option>
                <option value="restaurant">restaurant</option>
                <option value="bar">bar</option>
                <option value="shop">shop</option>
                <option value="park">park</option>
                <option value="museum">museum</option>
                <option value="hotel">hotel</option>
                <option value="other">other</option>
              </select>
            </div>

            <div
              className="form-group"
              style={{ display: "flex", gap: 10, alignItems: "center" }}
            >
              <input
                type="checkbox"
                checked={!!formData.isActive}
                onChange={(e) => handleFormChange("isActive", e.target.checked)}
              />
              <span>Active</span>
            </div>

            <div className="modal-actions">
              <button
                className="btn-cancel"
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn-confirm"
                onClick={handleSubmit}
                disabled={
                  !formData.name ||
                  !formData.address ||
                  !formData.latitude ||
                  !formData.longitude
                }
              >
                {editingLocation ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapManagement;
