import { createContext, useContext, useState, useEffect } from 'react';

const POIContext = createContext();

export const usePOI = () => {
  const context = useContext(POIContext);
  if (!context) {
    throw new Error('usePOI must be used within POIProvider');
  }
  return context;
};

export const POIProvider = ({ children }) => {
  const [pois, setPois] = useState([]);
  const [loading, setLoading] = useState(true);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token || ''}`
    };
  };

  // Cargar POIs desde la API
  const fetchPOIs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/locations', {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error('Error al cargar ubicaciones');
      }
      
      const data = await response.json();
      
      // Normalizar los datos para que tengan un 'id' consistente
      const normalizedData = data.map(poi => ({
        ...poi,
        id: poi._id || poi.id
      }));
      
      setPois(normalizedData);
    } catch (error) {
      console.error('Error fetching POIs:', error);
      setPois([]);
    } finally {
      setLoading(false);
    }
  };

  // Agregar nuevo POI
  const addPOI = async (poiData) => {
    try {
      const response = await fetch('/api/locations', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(poiData)
      });

      if (!response.ok) {
        throw new Error('Error al crear ubicación');
      }

      const newPOI = await response.json();
      return newPOI;
    } catch (error) {
      console.error('Error adding POI:', error);
      throw error;
    }
  };

  // Actualizar POI (toggle visibility)
  const toggleVisibility = async (id) => {
    try {
      // Encontrar el POI actual
      const poi = pois.find(p => p.id === id || p._id === id);
      if (!poi) throw new Error('POI no encontrado');

      const response = await fetch(`/api/locations/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ visible: !poi.visible })
      });

      if (!response.ok) {
        throw new Error('Error al actualizar visibilidad');
      }

      const updatedPOI = await response.json();
      
      // Actualizar el estado local
      setPois(prev => prev.map(p => 
        (p.id === id || p._id === id) 
          ? { ...updatedPOI, id: updatedPOI._id || updatedPOI.id }
          : p
      ));
      
      return updatedPOI;
    } catch (error) {
      console.error('Error toggling visibility:', error);
      throw error;
    }
  };

  // Eliminar POI
  const deletePOI = async (id) => {
    try {
      const response = await fetch(`/api/locations/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Error al eliminar ubicación');
      }

      // Remover del estado local
      setPois(prev => prev.filter(p => p.id !== id && p._id !== id));
    } catch (error) {
      console.error('Error deleting POI:', error);
      throw error;
    }
  };

  // Refrescar POIs (útil después de login)
  const refresh = async () => {
    await fetchPOIs();
  };

  // Cargar POIs al montar el componente
  useEffect(() => {
    fetchPOIs();
  }, []);

  const value = {
    pois,
    loading,
    addPOI,
    toggleVisibility,
    deletePOI,
    refresh
  };

  return (
    <POIContext.Provider value={value}>
      {children}
    </POIContext.Provider>
  );
};