import { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Layers, Info } from "lucide-react";
import { Link } from "react-router-dom";
import POIModal from "@/components/POIModal";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix for default markers in react-leaflet
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom marker icons for different POI types
const createCustomIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: 30px;
      height: 30px;
      background: ${color};
      border: 3px solid hsl(158 100% 50%);
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 0 20px ${color};
    "><div style="
      width: 10px;
      height: 10px;
      background: white;
      border-radius: 50%;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    "></div></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
  });
};

const powerIcon = createCustomIcon('hsl(158 100% 50%)'); // Green
const missionIcon = createCustomIcon('hsl(180 100% 50%)'); // Cyan
const refugeIcon = createCustomIcon('hsl(270 60% 50%)'); // Violet
const dangerIcon = createCustomIcon('hsl(0 80% 50%)'); // Red

interface POI {
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

// Sample POIs in Río Cuarto
const samplePOIs: POI[] = [
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

const MapView = () => {
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null);
  const [showInfo, setShowInfo] = useState(true);

  const getMarkerIcon = (type: POI['type']) => {
    switch(type) {
      case 'power': return powerIcon;
      case 'mission': return missionIcon;
      case 'refuge': return refugeIcon;
      case 'danger': return dangerIcon;
      default: return DefaultIcon;
    }
  };

  const renderMapChildren = () => (
    <>
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />

      {samplePOIs.filter(poi => poi.visible).map((poi) => (
        <Marker
          key={poi.id}
          position={[poi.lat, poi.lng]}
          icon={getMarkerIcon(poi.type)}
          eventHandlers={{
            click: () => setSelectedPOI(poi),
          }}
        >
          <Popup>
            <div className="font-mono text-sm">
              <div className="font-bold text-primary">{poi.name}</div>
              <div className="text-xs text-muted-foreground mt-1">{poi.description}</div>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );

  return (
    <div className="h-screen w-screen relative overflow-hidden">
      {/* CRT Effect */}
      <div className="fixed inset-0 scan-line pointer-events-none z-[1000]" />
      
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-[500] bg-background/90 backdrop-blur border-b border-primary/30">
        <div className="flex items-center justify-between p-4">
          <Link to="/">
            <Button variant="outline" size="sm" className="border-primary/50 text-primary font-mono">
              <ChevronLeft className="mr-1" size={16} />
              VOLVER
            </Button>
          </Link>
          <h1 className="text-xl md:text-2xl font-bold glow-text-green font-mono">
            MAPA NARRATIVO • RÍO CUARTO 1994
          </h1>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowInfo(!showInfo)}
            className="border-accent/50 text-accent font-mono"
          >
            <Info className="mr-1" size={16} />
            INFO
          </Button>
        </div>
      </div>

      {/* Info Panel */}
      {showInfo && (
        <div className="absolute top-20 right-4 z-[500] bg-card/95 backdrop-blur border border-primary/30 p-4 max-w-xs animate-slide-in-right">
          <h3 className="text-primary font-bold mb-2 font-mono">LEYENDA</h3>
          <div className="space-y-2 text-sm font-mono">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-primary border-glow-green" />
              <span>Punto de Poder</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-accent border-glow-cyan" />
              <span>Misión Activa</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-secondary" />
              <span>Refugio Seguro</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-destructive" />
              <span>Zona Peligrosa</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
            Haz click en los marcadores para más información
          </div>
        </div>
      )}

      {/* Map */}
      <div className="h-full w-full">
        <MapContainer
          center={[-33.1234, -64.3499]}
          zoom={13}
          className="h-full w-full"
          style={{ background: 'hsl(24 15% 8%)' }}
        >
          {renderMapChildren()}
        </MapContainer>
      </div>

      {/* POI Detail Modal */}
      {selectedPOI && (
        <POIModal 
          poi={selectedPOI} 
          onClose={() => setSelectedPOI(null)} 
        />
      )}

      {/* Status Bar */}
      <div className="absolute bottom-4 left-4 font-mono text-xs text-primary/70 border border-primary/20 bg-background/90 p-2 backdrop-blur z-[500]">
        <div>CONEXIÓN: ESTABLE</div>
        <div>UBICACIONES: {samplePOIs.filter(p => p.visible).length}</div>
        <div className="animate-pulse-glow">█</div>
      </div>
    </div>
  );
};

export default MapView;
