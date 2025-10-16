import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip } from 'react-leaflet';
import { Button } from '@/components/ui/button.jsx';
import { ChevronLeft, Info, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import POIModal from '@/components/POIModal.jsx';
import { usePOI } from '@/contexts/POIContext.jsx';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { jwtDecode } from 'jwt-decode';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

// Fix for default markers in react-leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom marker icons for different POI types
const createCustomIcon = (color) => {
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

const suggestionIcon = L.divIcon({
  className: 'custom-marker-suggestion',
  html: `<div style="
    font-size: 20px;
    color: hsl(48 95% 50%);
    text-shadow: 0 0 10px hsl(48 95% 50%);
  ">?</div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const MapView = () => {
  const { pois, loading } = usePOI();
  const [selectedPOI, setSelectedPOI] = useState(null);
  const [showInfo, setShowInfo] = useState(true);
  const [user, setUser] = useState(null);
    const [showOnlyMyCreations, setShowOnlyMyCreations] = useState(false);
  
    useEffect(() => {
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          const decoded = jwtDecode(token);
          setUser(decoded);
        } catch (error) {
          console.error("Failed to decode token:", error);
        }
      }
    }, []);
  
    const poisToRender = pois.reduce((acc, poi) => {
      const isOwner = poi.createdBy && user && poi.createdBy._id === user.id;
  
      const getIcon = () => {
        if (user?.role === 'player' && isOwner && !poi.visible) {
          return suggestionIcon;
        }
        switch (poi.type) {
          case 'power': return powerIcon;
          case 'mission': return missionIcon;
          case 'refuge': return refugeIcon;
          case 'danger': return dangerIcon;
          default: return DefaultIcon;
        }
      };
  
      if (user) {
        if (user.role === 'admin') {
          acc.push({ ...poi, icon: getIcon() });
        } else { // Player logic
          if (showOnlyMyCreations) {
            if (isOwner) {
              acc.push({ ...poi, icon: getIcon() });
            }
          } else {
            if (poi.visible || isOwner) {
              acc.push({ ...poi, icon: getIcon() });
            }
          }
        }
      } else { // Not logged in
        if (poi.visible) {
          acc.push({ ...poi, icon: getIcon() });
        }
      }
  
      return acc;
    }, []);

    const renderMapChildren = () => (
      <>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
  
        {poisToRender.map((poi) => (
            <Marker 
              key={poi.id || poi._id} 
              position={[poi.lat, poi.lng]} 
              icon={poi.icon} 
              eventHandlers={{ 
                click: () => setSelectedPOI(poi)
              }}
            >
              <Tooltip direction="top" offset={[0, -20]} opacity={0.9} permanent={false}>
                <div className="font-mono text-sm">
                  <div className="font-bold text-primary">{poi.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">{poi.description}</div>
                </div>
              </Tooltip>
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
          <h1 className="text-sm text-center md:text-2xl font-bold glow-text-green font-mono">MAPA NARRATIVO RÍO CUARTO 1994</h1>
          <Button variant="outline" size="sm" onClick={() => setShowInfo(!showInfo)} className="border-accent/50 text-accent font-mono">
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
             <div className="flex items-center gap-2">
              <div className="w-4 h-4 flex items-center justify-center font-bold text-yellow-400">?</div>
              <span>Sugerencia no aprobada</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground">Haz click en los marcadores para más información</div>
        </div>
      )}

      {/* Map */}
      <div className="h-full w-full">
        <MapContainer center={[-33.1234, -64.3499]} zoom={13} zoomControl={false}  className="h-full w-full" style={{ background: 'hsl(24 15% 8%)' }}>
          {loading ? null : renderMapChildren()}
        </MapContainer>
      </div>

      {/* POI Detail Modal */}
      {selectedPOI && <POIModal poi={selectedPOI} onClose={() => setSelectedPOI(null)} />}

      {/* Filter Sheet for Players */}
      {user && user.role === 'player' && (
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="absolute bottom-4 right-4 z-[500] border-primary/50 text-primary font-mono">
              <Filter size={20} />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom">
            <SheetHeader>
              <SheetTitle className="font-mono text-primary">Filtros del Mapa</SheetTitle>
              <SheetDescription className="font-mono text-muted-foreground">Ajusta qué puntos de interés se muestran en el mapa.</SheetDescription>
            </SheetHeader>
            <div className="py-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <Label htmlFor="my-creations-filter" className="font-mono">Mostrar solo mis creaciones</Label>
                <Switch 
                  id="my-creations-filter" 
                  checked={showOnlyMyCreations}
                  onCheckedChange={setShowOnlyMyCreations}
                />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Status Bar */}
      <div className="absolute bottom-4 left-4 font-mono text-xs text-primary/70 border border-primary/20 bg-background/90 p-2 backdrop-blur z-[500]">
        <div>CONEXIÓN: {loading ? 'CARGANDO' : 'ESTABLE'}</div>
        <div>UBICACIONES: {poisToRender.length}</div>
        <div className="animate-pulse-glow">█</div>
      </div>
    </div>
  );
};

export default MapView;