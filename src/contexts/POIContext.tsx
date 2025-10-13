import React, { createContext, useContext, useState } from 'react';

export interface POI {
  id: number;
  name: string;
  type: 'power' | 'mission' | 'refuge' | 'danger';
  lat: number;
  lng: number;
  description: string;
  sphere?: string;
  visible: boolean;
  narration?: string;
}

const initialPOIs: POI[] = [
  {
    id: 1,
    name: "La Terminal Vieja",
    type: "power",
    lat: -33.1301,
    lng: -64.3499,
    description: "Antigua terminal de ómnibus, abandonada. Las paredes vibran con ecos de despedidas nunca dichas.",
    sphere: "Entropía/Tiempo",
    visible: true,
    narration: "Los relojes se detienen aquí. El pasado sangra en el presente."
  },
  {
    id: 2,
    name: "Café del Boulevard",
    type: "refuge",
    lat: -33.1234,
    lng: -64.3478,
    description: "Refugio de la Curandera. Veladores rojos, cartas del tarot, y secretos murmurados entre el humo.",
    sphere: "Vida/Espíritu",
    visible: true,
    narration: "Un lugar fuera del tiempo. Aquí, la paradoja no puede tocarte... por ahora."
  },
  {
    id: 3,
    name: "Universidad Nacional RC",
    type: "mission",
    lat: -33.1189,
    lng: -64.3142,
    description: "Laboratorios del tecnócrata. Entre computadoras viejas y cables, la magia se codifica en binario.",
    sphere: "Fuerzas/Materia",
    visible: true,
    narration: "Los tecnócratas vigilan. Cada experimento es un ritual, cada ecuación es un hechizo."
  },
  {
    id: 4,
    name: "El Puente Carretero",
    type: "danger",
    lat: -33.1156,
    lng: -64.3523,
    description: "Cruce sobre el río. Aquí, entre dos mundos, la paradoja se manifiesta con violencia.",
    sphere: "Primordio/Correspondencia",
    visible: true,
    narration: "No cruces solo de noche. Las sombras tienen hambre, y la realidad se desgarra."
  },
  {
    id: 5,
    name: "Grafiti del Niño Punky",
    type: "mission",
    lat: -33.1278,
    lng: -64.3556,
    description: "Un mural en la pared: símbolos caóticos que cambian cada noche. Arte vivo, magia callejera.",
    sphere: "Caos/Primordio",
    visible: true,
    narration: "Los tags hablan. Si sabes leer entre las líneas, revelan verdades que la razón rechaza."
  }
];

interface POIContextType {
  pois: POI[];
  addPOI: (poi: Omit<POI, 'id'>) => void;
  toggleVisibility: (id: number) => void;
  updatePOI: (id: number, updates: Partial<POI>) => void;
  deletePOI: (id: number) => void;
}

const POIContext = createContext<POIContextType | undefined>(undefined);

export const POIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pois, setPOIs] = useState<POI[]>(initialPOIs);

  const addPOI = (poi: Omit<POI, 'id'>) => {
    const newPOI = {
      ...poi,
      id: Math.max(...pois.map(p => p.id), 0) + 1
    };
    setPOIs([...pois, newPOI]);
  };

  const toggleVisibility = (id: number) => {
    setPOIs(pois.map(poi => 
      poi.id === id ? { ...poi, visible: !poi.visible } : poi
    ));
  };

  const updatePOI = (id: number, updates: Partial<POI>) => {
    setPOIs(pois.map(poi => 
      poi.id === id ? { ...poi, ...updates } : poi
    ));
  };

  const deletePOI = (id: number) => {
    setPOIs(pois.filter(poi => poi.id !== id));
  };

  return (
    <POIContext.Provider value={{ pois, addPOI, toggleVisibility, updatePOI, deletePOI }}>
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
