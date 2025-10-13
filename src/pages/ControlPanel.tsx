import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ChevronLeft, Plus, Eye, EyeOff, Sparkles, Map, Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePOI, POI } from "@/contexts/POIContext";

const ControlPanel = () => {
  const { pois, toggleVisibility } = usePOI();
  const [showNewPOI, setShowNewPOI] = useState(false);

  const getTypeColor = (type: POI['type']) => {
    switch(type) {
      case 'power': return 'bg-primary text-primary-foreground';
      case 'mission': return 'bg-accent text-accent-foreground';
      case 'refuge': return 'bg-secondary text-secondary-foreground';
      case 'danger': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* CRT Effect */}
      <div className="fixed inset-0 scan-line pointer-events-none z-50" />
      
      {/* Header */}
      <div className="border-b border-primary/30 bg-card/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/">
              <Button variant="outline" size="sm" className="border-primary/50 text-primary font-mono">
                <ChevronLeft className="mr-1" size={16} />
                VOLVER
              </Button>
            </Link>
            <h1 className="text-xl md:text-2xl font-bold glow-text-green font-mono">
              PANEL DE CONTROL • NARRADOR
            </h1>
            <Link to="/map">
              <Button variant="outline" size="sm" className="border-accent/50 text-accent font-mono">
                <Map className="mr-1" size={16} />
                VER MAPA
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - POI List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-primary glow-text-green">
                  Ubicaciones Activas
                </h2>
                <p className="text-sm text-muted-foreground font-mono">
                  Gestiona los puntos de interés en el mapa
                </p>
              </div>
              <Button 
                onClick={() => setShowNewPOI(!showNewPOI)}
                className="bg-primary text-primary-foreground border-glow-green font-mono"
              >
                <Plus className="mr-2" size={16} />
                NUEVO POI
              </Button>
            </div>

            {/* New POI Form */}
            {showNewPOI && (
              <Card className="border-accent/50 border-glow-cyan animate-fade-in">
                <CardHeader>
                  <CardTitle className="text-accent font-mono">Crear Nueva Ubicación</CardTitle>
                  <CardDescription className="font-mono">
                    Define un nuevo punto de interés para la campaña
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="font-mono text-xs">NOMBRE</Label>
                    <Input placeholder="Ej: La Biblioteca Oculta" className="font-mono" />
                  </div>
                  <div>
                    <Label className="font-mono text-xs">TIPO</Label>
                    <select className="w-full px-3 py-2 bg-background border border-input rounded-md font-mono text-sm">
                      <option>power</option>
                      <option>mission</option>
                      <option>refuge</option>
                      <option>danger</option>
                    </select>
                  </div>
                  <div>
                    <Label className="font-mono text-xs">DESCRIPCIÓN</Label>
                    <Textarea placeholder="Descripción visible para todos..." className="font-mono" />
                  </div>
                  <div>
                    <Label className="font-mono text-xs">NARRACIÓN (PRIVADA)</Label>
                    <Textarea placeholder="Notas secretas del narrador..." className="font-mono" />
                  </div>
                  <div>
                    <Label className="font-mono text-xs">ESFERA MÁGICA</Label>
                    <Input placeholder="Ej: Correspondencia/Espíritu" className="font-mono" />
                  </div>
                  <div className="flex gap-3">
                    <Button className="flex-1 bg-primary text-primary-foreground font-mono">
                      <Save className="mr-2" size={16} />
                      GUARDAR
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowNewPOI(false)}
                      className="font-mono"
                    >
                      CANCELAR
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* POI List */}
            <div className="space-y-3">
              {pois.map((poi) => (
                <Card 
                  key={poi.id} 
                  className={`border-2 transition-all ${poi.visible ? 'border-primary/30' : 'border-muted opacity-60'}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={`${getTypeColor(poi.type)} font-mono text-xs`}>
                            {poi.type.toUpperCase()}
                          </Badge>
                          {poi.visible ? (
                            <Eye className="text-primary" size={16} />
                          ) : (
                            <EyeOff className="text-muted-foreground" size={16} />
                          )}
                        </div>
                        <h3 className="font-bold text-lg mb-1">{poi.name}</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {poi.description}
                        </p>
                        {poi.sphere && (
                          <div className="flex items-center gap-2 text-xs text-accent font-mono">
                            <Sparkles size={12} />
                            {poi.sphere}
                          </div>
                        )}
                        {poi.narration && (
                          <div className="mt-3 p-2 bg-secondary/10 border-l-2 border-secondary text-sm italic">
                            "{poi.narration}"
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          variant={poi.visible ? "default" : "outline"}
                          onClick={() => toggleVisibility(poi.id)}
                          className="font-mono"
                        >
                          {poi.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Right Column - Info & Stats */}
          <div className="space-y-4">
            <Card className="border-primary/30">
              <CardHeader>
                <CardTitle className="text-primary font-mono">ESTADÍSTICAS</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 font-mono text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total POIs:</span>
                  <span className="text-foreground font-bold">{pois.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Visibles:</span>
                  <span className="text-primary font-bold">{pois.filter(p => p.visible).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ocultos:</span>
                  <span className="text-muted-foreground font-bold">{pois.filter(p => !p.visible).length}</span>
                </div>
                <div className="pt-3 border-t border-border">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse-glow inline-block mr-2" />
                  <span className="text-primary">SISTEMA ACTIVO</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-secondary/30">
              <CardHeader>
                <CardTitle className="text-secondary font-mono glow-text-violet">ACTUALIZACIONES</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea 
                  placeholder="Publica una actualización de historia para los jugadores..." 
                  className="font-mono mb-3"
                  rows={4}
                />
                <Button className="w-full bg-secondary text-secondary-foreground font-mono">
                  <Sparkles className="mr-2" size={16} />
                  PUBLICAR EVENTO
                </Button>
              </CardContent>
            </Card>

            <Card className="border-accent/30 bg-gradient-to-br from-accent/5 to-transparent">
              <CardHeader>
                <CardTitle className="text-accent font-mono">PRÓXIMAMENTE</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm font-mono text-muted-foreground">
                <div>• Autenticación de usuarios</div>
                <div>• Base de datos persistente</div>
                <div>• Carga de imágenes</div>
                <div>• Timeline narrativo</div>
                <div>• Modo ritual/eventos</div>
                <div className="pt-2 text-xs text-accent">
                  Conecta Lovable Cloud para activar estas funciones
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
