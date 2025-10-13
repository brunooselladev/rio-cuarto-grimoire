import React, { createContext, useContext, useEffect, useState } from 'react';

const POIContext = createContext(undefined);

const getAuthHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const POIProvider = ({ children }) => {
  const [pois, setPOIs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const mapDoc = (doc) => ({
    id: doc._id,
    _id: doc._id,
    name: doc.name,
    type: doc.type || 'power',
    lat: doc.lat,
    lng: doc.lng,
    description: doc.description || '',
    sphere: doc.sphere || '',
    visible: typeof doc.visible === 'boolean' ? doc.visible : true,
    narration: doc.narration || '',
  });

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/locations');
      if (!res.ok) throw new Error('Error al cargar ubicaciones');
      const data = await res.json();
      setPOIs(data.map(mapDoc));
      setError(null);
    } catch (err) {
      setError(err.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const addPOI = async (poi) => {
    const body = {
      name: poi.name,
      description: poi.description || '',
      lat: Number(poi.lat),
      lng: Number(poi.lng),
      type: poi.type || 'power',
      visible: typeof poi.visible === 'boolean' ? poi.visible : true,
      sphere: poi.sphere || '',
      narration: poi.narration || '',
    };
    const res = await fetch('/api/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('No autorizado o datos inválidos');
    const created = await res.json();
    setPOIs((prev) => [mapDoc(created), ...prev]);
    return created;
  };

  const toggleVisibility = async (id) => {
    const current = pois.find((p) => p.id === id || p._id === id);
    if (!current) return;
    const res = await fetch(`/api/locations/${current._id || current.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ visible: !current.visible }),
    });
    if (!res.ok) throw new Error('No autorizado');
    const updated = await res.json();
    setPOIs((prev) => prev.map((p) => (p._id === updated._id || p.id === updated._id ? mapDoc(updated) : p)));
  };

  const updatePOI = async (id, updates) => {
    const res = await fetch(`/api/locations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('No autorizado');
    const updated = await res.json();
    setPOIs((prev) => prev.map((p) => (p._id === updated._id || p.id === updated._id ? mapDoc(updated) : p)));
  };

  const deletePOI = async (id) => {
    const target = pois.find((p) => p.id === id || p._id === id);
    if (!target) return;
    const res = await fetch(`/api/locations/${target._id || target.id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) throw new Error('No autorizado');
    setPOIs((prev) => prev.filter((p) => (p._id || p.id) !== (target._id || target.id)));
  };

  return (
    <POIContext.Provider value={{ pois, loading, error, addPOI, toggleVisibility, updatePOI, deletePOI, refresh: load }}>
      {children}
    </POIContext.Provider>
  );
};

export const usePOI = () => {
  const context = useContext(POIContext);
  if (context === undefined) {
    throw new Error('usePOI must be used within a POIProvider');
  }
  return context;
};
