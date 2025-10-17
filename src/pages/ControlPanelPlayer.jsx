import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Label } from '@/components/ui/label.jsx';
import { ChevronLeft, Plus, Sparkles, Map, Save, MapPin, Upload, X, Image as ImageIcon, FileText, BookUser } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { usePOI } from '@/contexts/POIContext.jsx';
import { useToast } from '@/hooks/use-toast.js';
import GooglePlacesInput from '@/components/GooglePlacesInput.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import CharacterSheet from "@/components/CharacterSheet.jsx";

const ControlPanelPlayer = ({ user }) => {
  const { pois, addPOI, loading, refresh } = usePOI();
  const [showNewPOI, setShowNewPOI] = useState(false);
  const [editingPOI, setEditingPOI] = useState(null);
  const [form, setForm] = useState({
    name: '',
    type: 'power',
    description: '',
    address: '',
    lat: '',
    lng: '',
    images: [],
  });
  const { toast } = useToast();
  const token = localStorage.getItem('authToken');

  const userPOIs = pois.filter(poi => poi.visible || (poi.createdBy && poi.createdBy._id === user.id));

  const getTypeColor = (type) => {
    switch (type) {
      case 'power': return 'bg-primary text-primary-foreground';
      case 'mission': return 'bg-accent text-accent-foreground';
      case 'refuge': return 'bg-secondary text-secondary-foreground';
      case 'danger': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleLocationSelect = ({ address, lat, lng }) => {
    setForm({ ...form, address, lat, lng });
    toast({ title: 'Ubicación seleccionada', description: address, duration: 2000 });
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    const base64Promises = files.map(file => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    });
    const base64Images = await Promise.all(base64Promises);
    setForm(prev => ({ ...prev, images: [...prev.images, ...base64Images] }));
    toast({ title: 'Imágenes cargadas', description: `${files.length} imagen(es) agregada(s)`, duration: 2000 });
  };

  const removeImage = (index) => {
    const newImages = form.images.filter((_, i) => i !== index);
    setForm({ ...form, images: newImages });
  };

  const handleSave = async () => {
    if (!form.name.trim()) return toast({ title: 'Error', description: 'El nombre es obligatorio' });
    if (!form.address || !form.lat || !form.lng) return toast({ title: 'Error', description: 'Selecciona una ubicación válida' });

    const lat = Number(form.lat);
    const lng = Number(form.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return toast({ title: 'Error', description: 'Coordenadas inválidas' });

    try {
      if (editingPOI) {
        await fetch(`/api/locations/${editingPOI.id || editingPOI._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ ...form, lat, lng }),
        });
        toast({ title: 'Ubicación actualizada', description: form.name });
      } else {
        await addPOI({ ...form, lat, lng, visible: false });
        toast({ title: 'Ubicación sugerida', description: 'Tu ubicación ha sido enviada para revisión del Narrador.' });
      }

      setForm({ name: '', type: 'power', description: '', address: '', lat: '', lng: '', images: [] });
      setEditingPOI(null);
      setShowNewPOI(false);
      await refresh();
    } catch (e) {
      toast({ title: 'Error', description: 'No autorizado o fallo al guardar' });
    }
  };

  const handleEdit = (poi) => {
    const isOwner = poi.createdBy && poi.createdBy._id === user.id;
    if (!isOwner) {
      return toast({ title: 'Acción no permitida', description: 'No puedes editar una ubicación que no creaste.' });
    }
    setEditingPOI(poi);
    setShowNewPOI(true);
    setForm({
      name: poi.name,
      type: poi.type,
      description: poi.description,
      address: poi.address || '',
      lat: poi.lat || '',
      lng: poi.lng || '',
      images: poi.images || [],
    });
  };

  return (
    <div className={"min-h-screen bg-background"}>
      <div className="fixed inset-0 scan-line pointer-events-none z-50" />
      <div className="border-b border-primary/30 bg-card/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
<div className="flex flex-col md:flex-row items-center md:justify-between gap-3">
            <h1 className="text-xl md:text-2xl font-bold glow-text-green font-mono truncate text-center md:order-2">
              PANEL DE JUGADOR • {user && user.sub ? user.sub.toUpperCase() : 'JUGADOR'}
            </h1>
            <div className="flex items-center gap-2 md:contents">
              <Link to="/" className="md:order-1">
                <Button variant="outline" size="sm" className="border-primary/50 text-primary font-mono">
                  <ChevronLeft className="mr-1" size={16} />
                  VOLVER
                </Button>
              </Link>
              <Link to="/map" className="md:order-3">
                <Button variant="outline" size="sm" className="border-accent/50 text-accent font-mono">
                  <Map className="mr-1" size={16} />
                  VER MAPA
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <Tabs defaultValue="poi" className="w-full">
          <TabsList className="grid w-full grid-cols-2 font-mono border-glow-cyan">
            <TabsTrigger value="poi"><BookUser className="mr-2" size={16}/>Mis Puntos de Interés</TabsTrigger>
            <TabsTrigger value="character"><FileText className="mr-2" size={16}/>Hoja de Personaje</TabsTrigger>
          </TabsList>
          
          <TabsContent value="poi">
            <div className="space-y-4 mt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-primary glow-text-green">Mis Puntos de Interés</h2>
                  <p className="text-sm text-muted-foreground font-mono">Gestiona y sugiere nuevos puntos de interés</p>
                </div>
                <Button onClick={() => setShowNewPOI(!showNewPOI)} className="bg-primary text-primary-foreground border-glow-green font-mono">
                  <Plus className="mr-2" size={16} />
                  SUGERIR POI
                </Button>
              </div>

              {showNewPOI && (
                <Card className="border-accent/50 border-glow-cyan animate-fade-in">
                  <CardHeader>
                    <CardTitle className="text-accent font-mono">{editingPOI ? 'Editar Mi Ubicación' : 'Sugerir Nueva Ubicación'}</CardTitle>
                    <CardDescription className="font-mono">{editingPOI ? 'Modifica los detalles de tu punto de interés.' : 'Propón un nuevo punto de interés para la campaña.'}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div><Label className="font-mono text-xs">NOMBRE</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: El Café del Artista" className="font-mono" /></div>
                    <div><Label className="font-mono text-xs">TIPO</Label><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 bg-background border border-input rounded-md font-mono text-sm"><option value="power">power</option><option value="mission">mission</option><option value="refuge">refuge</option><option value="danger">danger</option></select></div>
                    <div><Label className="font-mono text-xs">DIRECCIÓN</Label><GooglePlacesInput value={form.address} onSelect={handleLocationSelect} placeholder="Buscar dirección en Río Cuarto..." />
                      {form.address && (<div className="mt-2 flex items-start gap-2 text-xs text-muted-foreground font-mono p-2 bg-primary/5 rounded border border-primary/20"><MapPin size={14} className="mt-0.5 text-primary flex-shrink-0" /><div><div className="text-primary font-semibold">{form.address}</div><div className="mt-1">Lat: {form.lat} | Lng: {form.lng}</div></div></div>)}
                    </div>
                    <div><Label className="font-mono text-xs">DESCRIPCIÓN</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="¿Qué tiene de especial este lugar?" className="font-mono" /></div>
                    <div><Label className="font-mono text-xs">IMÁGENES (OPCIONAL)</Label><div className="space-y-3"><div className="flex items-center gap-2"><input type="file" id="image-upload" accept="image/*" multiple onChange={handleImageUpload} className="hidden" /><label htmlFor="image-upload" className="cursor-pointer"><div className="flex items-center gap-2 px-4 py-2 border border-primary/50 rounded-md hover:bg-primary/10 transition-colors font-mono text-sm"><Upload size={16} />CARGAR IMÁGENES</div></label><span className="text-xs text-muted-foreground font-mono">{form.images.length} imagen(es)</span></div>{form.images.length > 0 && (<div className="grid grid-cols-3 gap-2">{form.images.map((img, idx) => (<div key={idx} className="relative group"><img src={img} alt={`Preview ${idx + 1}`} className="w-full h-20 object-cover rounded border border-primary/30" /><button onClick={() => removeImage(idx)} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><X size={12} /></button></div>))}</div>)}</div></div>
                    <div className="flex gap-3"><Button className="flex-1 bg-primary text-primary-foreground font-mono" onClick={handleSave}><Save className="mr-2" size={16} /> GUARDAR</Button><Button variant="outline" onClick={() => { setShowNewPOI(false); setEditingPOI(null); }} className="font-mono">CANCELAR</Button></div>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-3">
                {loading && <div className="text-sm text-muted-foreground font-mono">Cargando ubicaciones...</div>}
                {!loading && userPOIs.length === 0 && <div className="text-sm text-muted-foreground font-mono">No hay ubicaciones visibles o creadas por ti.</div>}
                {userPOIs.map((poi) => {
                  const isOwner = poi.createdBy && poi.createdBy._id === user.id;
                  return (
                    <Card key={poi.id || poi._id} className={`border-2 transition-all ${isOwner ? 'border-green-500/50' : 'border-primary/30'}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2"><Badge className={`${getTypeColor(poi.type)} font-mono text-xs`}>{String(poi.type).toUpperCase()}</Badge>{poi.createdBy && (<Badge variant="outline" className={`font-mono text-xs ${isOwner ? 'border-green-500/80 text-green-500' : 'border-muted-foreground/50'}`}>{isOwner ? 'Creado por mí' : `Por: ${poi.createdBy.username}`}</Badge>)}{poi.images && poi.images.length > 0 && (<Badge variant="outline" className="font-mono text-xs border-accent/50 text-accent"><ImageIcon size={10} className="mr-1" />{poi.images.length}</Badge>)}</div>
                            <h3 className="font-bold text-lg mb-1">{poi.name}</h3>
                            {poi.address && (<div className="flex items-start gap-2 text-xs text-muted-foreground mb-2 font-mono"><MapPin size={12} className="mt-0.5 flex-shrink-0" /><span>{poi.address}</span></div>)}
                            <p className="text-sm text-muted-foreground mb-2">{poi.description}</p>
                            {poi.sphere && (<div className="flex items-center gap-2 text-xs text-accent font-mono"><Sparkles size={12} />{poi.sphere}</div>)}
                          </div>
                          {isOwner && (<div className="flex flex-col gap-2"><Button size="sm" variant="outline" onClick={() => handleEdit(poi)} className="font-mono">✏️</Button></div>)}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="character">
            <CharacterSheet user={user} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ControlPanelPlayer;
