import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Label } from '@/components/ui/label.jsx';
import { ChevronLeft, Plus, Eye, EyeOff, Sparkles, Map, Save, Trash2, LogIn, MapPin } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { usePOI } from '@/contexts/POIContext.jsx';
import { useToast } from '@/hooks/use-toast.js';
import GooglePlacesInput from '@/components/GooglePlacesInput.jsx';

const ControlPanel = () => {
  const { pois, toggleVisibility, addPOI, deletePOI, loading, refresh } = usePOI();
  const [showNewPOI, setShowNewPOI] = useState(false);
  const [form, setForm] = useState({
    name: '',
    type: 'power',
    description: '',
    narration: '',
    sphere: '',
    address: '',
    lat: '',
    lng: '',
  });
  const [auth, setAuth] = useState({ username: '', password: '' });
  const [token, setToken] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    setToken(localStorage.getItem('authToken'));
  }, []);

  const getTypeColor = (type) => {
    switch (type) {
      case 'power':
        return 'bg-primary text-primary-foreground';
      case 'mission':
        return 'bg-accent text-accent-foreground';
      case 'refuge':
        return 'bg-secondary text-secondary-foreground';
      case 'danger':
        return 'bg-destructive text-destructive-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const handleLocationSelect = ({ address, lat, lng }) => {
    setForm({ ...form, address, lat, lng });
    toast({ 
      title: 'Ubicación seleccionada', 
      description: address,
      duration: 2000 
    });
  };

  const handleSave = async () => {
    // Basic validations
    if (!form.name.trim()) {
      return toast({ title: 'Error', description: 'El nombre es obligatorio' });
    }
    
    if (!form.address || !form.lat || !form.lng) {
      return toast({ 
        title: 'Error', 
        description: 'Selecciona una ubicación válida antes de guardar' 
      });
    }

    const lat = Number(form.lat);
    const lng = Number(form.lng);
    
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return toast({ title: 'Error', description: 'Coordenadas inválidas' });
    }

    try {
      await addPOI({ ...form, lat, lng, visible: true });
      toast({ title: 'Ubicación guardada', description: form.name });
      setForm({ 
        name: '', 
        type: 'power', 
        description: '', 
        narration: '', 
        sphere: '', 
        address: '',
        lat: '', 
        lng: '' 
      });
      setShowNewPOI(false);
    } catch (e) {
      toast({ title: 'Error', description: 'No autorizado o fallo al guardar' });
    }
  };

  const handleDelete = async (poi) => {
    if (!confirm(`Eliminar "${poi.name}"?`)) return;
    try {
      await deletePOI(poi._id || poi.id);
      toast({ title: 'Eliminado', description: poi.name });
    } catch (e) {
      toast({ title: 'Error', description: 'No autorizado o fallo al eliminar' });
    }
  };

  const submitLogin = async () => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(auth),
      });
      if (!res.ok) throw new Error('Credenciales inválidas');
      const data = await res.json();
      localStorage.setItem('authToken', data.token);
      setToken(data.token);
      toast({ title: 'Sesión iniciada', description: auth.username });
      await refresh();
    } catch (e) {
      toast({ title: 'Error de login', description: 'Usuario o contraseña inválidos' });
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
            <h1 className="text-xl md:text-2xl font-bold glow-text-green font-mono">PANEL DE CONTROL • NARRADOR</h1>
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
        {!token && (
          <Card className="mb-6 border-destructive/40">
            <CardHeader>
              <CardTitle className="text-destructive font-mono">Acceso Narrador</CardTitle>
              <CardDescription>Inicia sesión para crear, editar y eliminar ubicaciones</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="font-mono text-xs">USUARIO</Label>
                <Input value={auth.username} onChange={(e) => setAuth({ ...auth, username: e.target.value })} className="font-mono" />
              </div>
              <div>
                <Label className="font-mono text-xs">CONTRASEÑA</Label>
                <Input type="password" value={auth.password} onChange={(e) => setAuth({ ...auth, password: e.target.value })} className="font-mono" />
              </div>
              <div className="flex items-end">
                <Button className="w-full" onClick={submitLogin}>
                  <LogIn className="mr-2" size={16} /> Ingresar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - POI List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-primary glow-text-green">Ubicaciones Activas</h2>
                <p className="text-sm text-muted-foreground font-mono">Gestiona los puntos de interés en el mapa</p>
              </div>
              <Button onClick={() => setShowNewPOI(!showNewPOI)} className="bg-primary text-primary-foreground border-glow-green font-mono" disabled={!token}>
                <Plus className="mr-2" size={16} />
                NUEVO POI
              </Button>
            </div>

            {/* New POI Form */}
            {showNewPOI && (
              <Card className="border-accent/50 border-glow-cyan animate-fade-in">
                <CardHeader>
                  <CardTitle className="text-accent font-mono">Crear Nueva Ubicación</CardTitle>
                  <CardDescription className="font-mono">Define un nuevo punto de interés para la campaña</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="font-mono text-xs">NOMBRE</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: La Biblioteca Oculta" className="font-mono" />
                  </div>
                  <div>
                    <Label className="font-mono text-xs">TIPO</Label>
                    <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 bg-background border border-input rounded-md font-mono text-sm">
                      <option value="power">power</option>
                      <option value="mission">mission</option>
                      <option value="refuge">refuge</option>
                      <option value="danger">danger</option>
                    </select>
                  </div>
                  <div>
                    <Label className="font-mono text-xs">DIRECCIÓN</Label>
                    <GooglePlacesInput
                      value={form.address}
                      onSelect={handleLocationSelect}
                      placeholder="Buscar dirección en Río Cuarto..."
                    />
                    {form.address && (
                      <div className="mt-2 flex items-start gap-2 text-xs text-muted-foreground font-mono p-2 bg-primary/5 rounded border border-primary/20">
                        <MapPin size={14} className="mt-0.5 text-primary flex-shrink-0" />
                        <div>
                          <div className="text-primary font-semibold">{form.address}</div>
                          <div className="mt-1">Lat: {form.lat} | Lng: {form.lng}</div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <Label className="font-mono text-xs">DESCRIPCIÓN</Label>
                    <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descripción visible para todos..." className="font-mono" />
                  </div>
                  <div>
                    <Label className="font-mono text-xs">NARRACIÓN (PRIVADA)</Label>
                    <Textarea value={form.narration} onChange={(e) => setForm({ ...form, narration: e.target.value })} placeholder="Notas secretas del narrador..." className="font-mono" />
                  </div>
                  <div>
                    <Label className="font-mono text-xs">ESFERA MÁGICA</Label>
                    <Input value={form.sphere} onChange={(e) => setForm({ ...form, sphere: e.target.value })} placeholder="Ej: Correspondencia/Espíritu" className="font-mono" />
                  </div>
                  <div className="flex gap-3">
                    <Button className="flex-1 bg-primary text-primary-foreground font-mono" onClick={handleSave} disabled={!token}>
                      <Save className="mr-2" size={16} /> GUARDAR
                    </Button>
                    <Button variant="outline" onClick={() => setShowNewPOI(false)} className="font-mono">
                      CANCELAR
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* POI List */}
            <div className="space-y-3">
              {loading && <div className="text-sm text-muted-foreground font-mono">Cargando ubicaciones...</div>}
              {!loading && pois.length === 0 && <div className="text-sm text-muted-foreground font-mono">No hay ubicaciones cargadas.</div>}
              {pois.map((poi) => (
                <Card key={poi.id || poi._id} className={`border-2 transition-all ${poi.visible ? 'border-primary/30' : 'border-muted opacity-60'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={`${getTypeColor(poi.type)} font-mono text-xs`}>{String(poi.type).toUpperCase()}</Badge>
                          {poi.visible ? <Eye className="text-primary" size={16} /> : <EyeOff className="text-muted-foreground" size={16} />}
                        </div>
                        <h3 className="font-bold text-lg mb-1">{poi.name}</h3>
                        {poi.address && (
                          <div className="flex items-start gap-2 text-xs text-muted-foreground mb-2 font-mono">
                            <MapPin size={12} className="mt-0.5 flex-shrink-0" />
                            <span>{poi.address}</span>
                          </div>
                        )}
                        <p className="text-sm text-muted-foreground mb-2">{poi.description}</p>
                        {poi.sphere && (
                          <div className="flex items-center gap-2 text-xs text-accent font-mono">
                            <Sparkles size={12} />
                            {poi.sphere}
                          </div>
                        )}
                        {poi.narration && <div className="mt-3 p-2 bg-secondary/10 border-l-2 border-secondary text-sm italic">"{poi.narration}"</div>}
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button size="sm" variant={poi.visible ? 'default' : 'outline'} onClick={() => toggleVisibility(poi.id || poi._id)} className="font-mono" disabled={!token}>
                          {poi.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDelete(poi)} className="font-mono" disabled={!token}>
                          <Trash2 size={14} />
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
                  <span className="text-primary font-bold">{pois.filter((p) => p.visible).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ocultos:</span>
                  <span className="text-muted-foreground font-bold">{pois.filter((p) => !p.visible).length}</span>
                </div>
                <div className="pt-3 border-t border-border">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse-glow inline-block mr-2" />
                  <span className="text-primary">SISTEMA {loading ? 'CARGANDO' : 'ACTIVO'}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-secondary/30">
              <CardHeader>
                <CardTitle className="text-secondary font-mono glow-text-violet">ACTUALIZACIONES</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea placeholder="Publica una actualización de historia para los jugadores..." className="font-mono mb-3" rows={4} />
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
                <div>• Carga de imágenes</div>
                <div>• Timeline narrativo</div>
                <div>• Modo ritual/eventos</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;