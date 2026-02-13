import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { getAllLocations, createLocation, updateLocation, deleteLocation } from "../../api/admin.api";
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

const MapManagement = () => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapCenter] = useState([10.8231, 106.6297]); // Ho Chi Minh City
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    latitude: "",
    longitude: "",
    description: ""
  });

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    setLoading(true);
    const res = await getAllLocations(1, 100);
    if (res.success) {
      setLocations(res.data.locations || []);
    }
    setLoading(false);
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddClick = () => {
    setFormData({
      name: "",
      address: "",
      latitude: "",
      longitude: "",
      description: ""
    });
    setEditingLocation(null);
    setShowAddModal(true);
  };

  const handleEditClick = (location) => {
    setFormData({
      name: location.name,
      address: location.address,
      latitude: location.latitude.toString(),
      longitude: location.longitude.toString(),
      description: location.description || ""
    });
    setEditingLocation(location);
    setShowAddModal(true);
  };

  const handleSubmit = async () => {
    const data = {
      name: formData.name,
      address: formData.address,
      latitude: parseFloat(formData.latitude),
      longitude: parseFloat(formData.longitude),
      description: formData.description
    };

    let res;
    if (editingLocation) {
      res = await updateLocation(editingLocation.id, data);
    } else {
      res = await createLocation(data);
    }

    if (res.success) {
      fetchLocations();
      setShowAddModal(false);
      setFormData({
        name: "",
        address: "",
        latitude: "",
        longitude: "",
        description: ""
      });
    }
  };

  const handleDelete = async (locationId) => {
    if (!window.confirm("Are you sure you want to delete this location?")) return;

    const res = await deleteLocation(locationId);
    if (res.success) {
      setLocations(prev => prev.filter(l => l.id !== locationId));
    }
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
        <button className="btn-add" onClick={handleAddClick}>
          + Add Location
        </button>
      </div>

      {/* Map */}
      <div className="map-container">
        <MapContainer 
          center={mapCenter} 
          zoom={13} 
          className="leaflet-map"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {locations.map(location => (
            <Marker 
              key={location.id}
              position={[location.latitude, location.longitude]}
            >
              <Popup>
                <div className="popup-content">
                  <strong>{location.name}</strong>
                  <p>{location.address}</p>
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
          {locations.map(location => (
            <div key={location.id} className="location-item">
              <div className="location-info">
                <div className="location-name">{location.name}</div>
                <div className="location-address">{location.address}</div>
                <div className="location-coords">
                  {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
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
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{editingLocation ? 'Edit Location' : 'Add New Location'}</h3>
            
            <div className="form-group">
              <label>Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleFormChange('name', e.target.value)}
                placeholder="Location name"
              />
            </div>

            <div className="form-group">
              <label>Address *</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleFormChange('address', e.target.value)}
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
                  onChange={(e) => handleFormChange('latitude', e.target.value)}
                  placeholder="10.8231"
                />
              </div>
              <div className="form-group">
                <label>Longitude *</label>
                <input
                  type="number"
                  step="0.000001"
                  value={formData.longitude}
                  onChange={(e) => handleFormChange('longitude', e.target.value)}
                  placeholder="106.6297"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleFormChange('description', e.target.value)}
                placeholder="Additional information..."
                rows="3"
              />
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
                disabled={!formData.name || !formData.address || !formData.latitude || !formData.longitude}
              >
                {editingLocation ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapManagement;