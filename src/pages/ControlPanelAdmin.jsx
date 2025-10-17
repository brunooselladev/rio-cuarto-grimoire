import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Label } from '@/components/ui/label.jsx';
import { ChevronLeft, Plus, Eye, EyeOff, Sparkles, Map, Save, Trash2, LogIn, LogOut, MapPin, Upload, X, Image as ImageIcon, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { usePOI } from '@/contexts/POIContext.jsx';
import { useToast } from '@/hooks/use-toast.js';
import GooglePlacesInput from '@/components/GooglePlacesInput.jsx';
import PlayerCard from '@/components/PlayerCard.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";

const ControlPanelAdmin = ({ user, onLogout }) => {
  const { pois, toggleVisibility, addPOI, deletePOI, loading, refresh } = usePOI();
  const [showNewPOI, setShowNewPOI] = useState(false);
  const [editingPOI, setEditingPOI] = useState(null);
  const [sheets, setSheets] = useState([]);

  const [form, setForm] = useState({
    name: '',
    type: 'power',
    description: '',
    narration: '',
    sphere: '',
    address: '',
    lat: '',
    lng: '',
    images: [],
  });
  const [auth, setAuth] = useState({ username: '', password: '' });
  const [token, setToken] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    setToken(localStorage.getItem('authToken'));
  }, []);

  useEffect(() => {
    const fetchSheets = async () => {
      if (token) {
        try {
          const response = await fetch('/api/character/all', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!response.ok) throw new Error('Failed to fetch character sheets');
          const data = await response.json();
          setSheets(data);
        } catch (error) {
          toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
      }
    };
    fetchSheets();
  }, [token, toast]);

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

  // 🗜️ FUNCIÓN PARA COMPRIMIR IMÁGENES
  const compressImage = (file, maxWidth = 800, quality = 0.7) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Crear canvas para redimensionar
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Redimensionar si es muy grande
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Convertir a base64 comprimido (JPEG con calidad reducida)
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          
          // Calcular tamaño aproximado
          const sizeKB = Math.round((compressedBase64.length * 3) / 4 / 1024);
          
          resolve({ data: compressedBase64, sizeKB });
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    
    toast({
      title: 'Comprimiendo imágenes...',
      description: 'Por favor espera',
      duration: 2000
    });

    try {
      const compressedPromises = files.map(file => compressImage(file));
      const compressedImages = await Promise.all(compressedPromises);

      const totalSizeKB = compressedImages.reduce((sum, img) => sum + img.sizeKB, 0);
      const base64Data = compressedImages.map(img => img.data);

      setForm(prev => ({
        ...prev,
        images: [...prev.images, ...base64Data],
      }));

      toast({
        title: 'Imágenes comprimidas ✅',
        description: `${files.length} imagen(es) - ~${totalSizeKB}KB total`,
        duration: 3000
      });
    } catch (err) {
      console.error('Error al comprimir imágenes:', err);
      toast({
        title: 'Error',
        description: 'No se pudieron procesar las imágenes',
        variant: 'destructive'
      });
    }
  };

  const removeImage = (index) => {
    const newImages = form.images.filter((_, i) => i !== index);
    setForm({ ...form, images: newImages });
  };

  const handleSave = async () => {
    if (!form.name.trim()) return toast({ title: 'Error', description: 'El nombre es obligatorio' });
    if (!form.address || !form.lat || !form.lng) return toast({ title: 'Error', description: 'Selecciona una ubicación válida antes de guardar' });
    
    const lat = Number(form.lat);
    const lng = Number(form.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return toast({ title: 'Error', description: 'Coordenadas inválidas' });

    // 🗜️ Validar tamaño de imágenes (seguridad extra)
    const totalImageSize = form.images.reduce((sum, img) => sum + (img.length * 3 / 4), 0);
    const totalSizeMB = (totalImageSize / (1024 * 1024)).toFixed(2);
    
    if (totalSizeMB > 10) {
      return toast({ 
        title: 'Imágenes muy pesadas', 
        description: `Total: ${totalSizeMB}MB. Máximo permitido: 10MB. Elimina algunas imágenes.`,
        variant: 'destructive'
      });
    }

    try {
      if (editingPOI) {
        // 🔧 MODO EDICIÓN
        const res = await fetch(`/api/locations/${editingPOI._id || editingPOI.id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ ...form, lat, lng }),
        });
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || `Error ${res.status}: No se pudo actualizar`);
        }
        
        toast({ title: 'Ubicación actualizada', description: form.name });
      } else {
        // ✨ NUEVA
        await addPOI({ ...form, lat, lng, visible: true });
        toast({ title: 'Ubicación guardada', description: form.name });
      }
      
      setForm({
        name: '', type: 'power', description: '', narration: '', sphere: '',
        address: '', lat: '', lng: '', images: [],
      });
      setEditingPOI(null);
      setShowNewPOI(false);
      await refresh();
    } catch (e) {
      console.error('Error al guardar:', e);
      toast({ 
        title: 'Error', 
        description: e.message || 'No autorizado o fallo al guardar',
        variant: 'destructive'
      });
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

  const handleEdit = (poi) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setEditingPOI(poi);
    setShowNewPOI(true);
    setForm({
      name: poi.name,
      type: poi.type,
      description: poi.description,
      narration: poi.narration || '',
      sphere: poi.sphere || '',
      address: poi.address || '',
      lat: poi.lat || '',
      lng: poi.lng || '',
      images: poi.images || [],
    });
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
    <div className={"min-h-screen bg-background"}>
      {/* CRT Effect */}
      <div className="fixed inset-0 scan-line pointer-events-none z-50" />

      {/* Header */}
      <div className="border-b border-primary/30 bg-card/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row items-center md:justify-between gap-3">
            <h1 className="text-xl md:text-2xl font-bold glow-text-green font-mono truncate text-center md:order-2">
              PANEL DE JUGADOR • {user && user.sub ? user.sub.toUpperCase() : 'JUGADOR'}
            </h1>
            <div className="flex w-full flex-col md:contents gap-3 md:gap-0">
              <div className="flex w-full md:w-auto items-center gap-2">
                <Link to="/" className="w-full md:w-auto md:order-1">
                  <Button variant="outline" size="sm" className="w-full md:w-auto border-primary/50 text-primary font-mono">
                    <ChevronLeft className="mr-1" size={16} />
                    VOLVER
                  </Button>
                </Link>
                <Link to="/map" className="w-full md:w-auto md:order-3">
                  <Button variant="outline" size="sm" className="w-full md:w-auto border-accent/50 text-accent font-mono">
                    <Map className="mr-1" size={16} />
                    VER MAPA
                  </Button>
                </Link>
              </div>
              <Button variant="outline" size="sm" onClick={onLogout} className="border-destructive/50 text-destructive font-mono md:order-3 w-full md:w-auto">
                <LogOut className="mr-1" size={16} />
                CERRAR SESIÓN
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {!token && (
          <Card className="mb-6 border-destructive/40 relative z-40">
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

        <Tabs defaultValue="ubicaciones" className="w-full">
          <TabsList className="grid w-full grid-cols-3 font-mono border-glow-cyan">
            <TabsTrigger value="ubicaciones">Ubicaciones</TabsTrigger>
            <TabsTrigger value="jugadores">Jugadores</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
          </TabsList>

          <TabsContent value="ubicaciones">
            <div className={`lg:col-span-2 space-y-4 relative ${!token ? 'pointer-events-none' : ''}`}>
              {!token && (
                <div className="absolute inset-0 bg-background/60 backdrop-blur-md z-40 rounded-lg flex items-center justify-center">
                  <div className="text-center font-mono text-muted-foreground">
                    <LogIn className="mx-auto mb-2 opacity-50" size={32} />
                    <p className="text-sm">Inicia sesión para acceder al panel</p>
                  </div>
                </div>
              )}
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

              {showNewPOI && (
                <Card className="border-accent/50 border-glow-cyan animate-fade-in">
                  <CardHeader>
                    <CardTitle className="text-accent font-mono">
                      {editingPOI ? 'Editar Ubicación' : 'Crear Nueva Ubicación'}
                    </CardTitle>
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
                    <div>
                      <Label className="font-mono text-xs">IMÁGENES (OPCIONAL)</Label>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            id="image-upload"
                            accept="image/*"
                            multiple
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                          <label htmlFor="image-upload" className="cursor-pointer">
                            <div className="flex items-center gap-2 px-4 py-2 border border-primary/50 rounded-md hover:bg-primary/10 transition-colors font-mono text-sm">
                              <Upload size={16} />
                              CARGAR IMÁGENES
                            </div>
                          </label>
                          <span className="text-xs text-muted-foreground font-mono">
                            {form.images.length} imagen(es)
                          </span>
                        </div>
                        {form.images.length > 0 && (
                          <div className="grid grid-cols-3 gap-2">
                            {form.images.map((img, idx) => (
                              <div key={idx} className="relative group">
                                <img 
                                  src={img} 
                                  alt={`Preview ${idx + 1}`} 
                                  className="w-full h-20 object-cover rounded border border-primary/30"
                                />
                                <button
                                  onClick={() => removeImage(idx)}
                                  className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground italic font-mono p-2 bg-accent/5 rounded border border-accent/20">
                          <ImageIcon size={12} className="inline mr-1" />
                          Las imágenes se comprimen automáticamente (max 800px, calidad 70%).
                        </div>
                      </div>
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
                            {poi.createdBy && <Badge variant="outline" className="font-mono text-xs">Por: {poi.createdBy.username}</Badge>}
                            {poi.images && poi.images.length > 0 && (
                              <Badge variant="outline" className="font-mono text-xs border-accent/50 text-accent">
                                <ImageIcon size={10} className="mr-1" />
                                {poi.images.length}
                              </Badge>
                            )}
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
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(poi)}
                            className="font-mono"
                            disabled={!token}
                          >
                            ✏️
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="jugadores">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-secondary glow-text-violet">Jugadores</h2>
              {sheets.map(sheet => (
                <PlayerCard key={sheet._id} sheet={sheet} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="general">
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
                  <CardTitle className="text-accent font-mono">NUEVA FUNCIÓN</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm font-mono">
                  <div className="flex items-center gap-2 text-primary">
                    <ImageIcon size={16} />
                    <span className="font-bold">Galería de imágenes</span>
                  </div>
                  <div className="text-muted-foreground text-xs">
                    • Carga múltiples imágenes por POI<br/>
                    • Street View automático<br/>
                    • Vista ampliada con lightbox
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ControlPanelAdmin;