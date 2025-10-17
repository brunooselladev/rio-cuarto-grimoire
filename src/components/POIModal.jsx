import { X, Eye, Sparkles, Map, ChevronDown, ChevronUp, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea.jsx';
import { useToast } from '@/hooks/use-toast.js';

const getTypeColor = (type) => {
  switch (type) {
    case 'power':
      return 'text-primary border-primary';
    case 'mission':
      return 'text-accent border-accent';
    case 'refuge':
      return 'text-secondary border-secondary';
    case 'danger':
      return 'text-destructive border-destructive';
    default:
      return 'text-foreground border-border';
  }
};

const getTypeLabel = (type) => {
  switch (type) {
    case 'power':
      return 'PUNTO DE PODER';
    case 'mission':
      return 'MISIÓN ACTIVA';
    case 'refuge':
      return 'REFUGIO';
    case 'danger':
      return 'ZONA PELIGROSA';
    default:
      return 'UBICACIÓN';
  }
};

const POIModal = ({ poi, user, onClose, refresh }) => {
  const typeColorClass = getTypeColor(poi.type);
  const [showGallery, setShowGallery] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [events, setEvents] = useState(poi.events || []);
  const [newEvent, setNewEvent] = useState('');
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);
  const [editingEventContent, setEditingEventContent] = useState('');
  const { toast } = useToast();
  const token = localStorage.getItem('authToken');

  useEffect(() => {
    setEvents(poi.events || []);
  }, [poi.events]);

  const handleAddEvent = async () => {
    if (!newEvent.trim()) return;

    try {
      const response = await fetch(`/api/locations/${poi._id}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: newEvent }),
      });

      if (!response.ok) throw new Error('Failed to add event');

      const savedEvent = await response.json();
      setEvents([...events, savedEvent]);
      setNewEvent('');
      setShowEventForm(false);
      toast({ title: 'Evento marcado' });
      await refresh();
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleUpdateEvent = async (eventId) => {
    try {
      const response = await fetch(`/api/locations/${poi._id}/events/${eventId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: editingEventContent }),
      });

      if (!response.ok) throw new Error('Failed to update event');

      const updatedEvent = await response.json();
      setEvents(events.map(e => (e._id === eventId ? updatedEvent : e)));
      setEditingEventId(null);
      setEditingEventContent('');
      toast({ title: 'Evento actualizado' });
      await refresh();
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este evento?')) return;

    try {
      const response = await fetch(`/api/locations/${poi._id}/events/${eventId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to delete event');

      setEvents(events.filter(e => e._id !== eventId));
      toast({ title: 'Evento eliminado' });
      await refresh();
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  // Google Street View URL como imagen por defecto
const getStreetViewUrl = (lat, lng) => {
  const apiKey = import.meta.env.VITE_API_GOOGLE;
  return `https://maps.googleapis.com/maps/api/streetview?size=600x400&location=${lat},${lng}&fov=90&heading=0&pitch=0&key=${apiKey}`;
};

  // Si no hay imágenes cargadas, usar Street View
  const streetViewUrl = getStreetViewUrl(poi.lat, poi.lng);
  const images = [streetViewUrl, ...(poi.images || [])];


  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>

      <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />

        {/* Modal */}
        <div className="relative bg-card border-2 border-primary max-w-2xl w-full max-h-[85vh] overflow-x-hidden overflow-y-auto animate-fade-in border-glow-green">
          {/* Glitch effect on border */}
          <div className="absolute inset-0 border-2 border-accent/30 animate-glitch pointer-events-none" />

          {/* Header */}
          <div className="sticky top-0 bg-card/95 backdrop-blur border-b border-primary/30 p-6 z-10">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className={`text-xs font-mono mb-2 ${typeColorClass} font-bold tracking-wider`}>
                  {getTypeLabel(poi.type)}
                </div>
                <h2 className="text-2xl md:text-3xl font-bold glow-text-green mb-2">{poi.name}</h2>
                {poi.sphere && (
                  <div className="flex items-center gap-2 text-sm text-accent font-mono">
                    <Sparkles size={16} />
                    <span>ESFERA: {poi.sphere}</span>
                  </div>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="text-primary hover:text-primary/80 hover:bg-primary/10">
                <X size={24} />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Description */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-mono text-primary">
                <Map size={16} />
                <span>DESCRIPCIÓN</span>
              </div>
              <p className="text-foreground leading-relaxed pl-6 border-l-2 border-primary/30">{poi.description}</p>
            </div>

            {/* Narration */}
            {poi.narration && (
              <div className="space-y-2 bg-secondary/10 p-4 border-l-4 border-secondary">
                <div className="flex items-center gap-2 text-sm font-mono text-secondary glow-text-violet">
                  <Eye size={16} />
                  <span>NARRACIÓN</span>
                </div>
                <p className="text-foreground italic leading-relaxed">"{poi.narration}"</p>
              </div>
            )}

            {/* Coordinates */}
            <div className="border-t border-border pt-4">
              <div className="text-xs font-mono text-muted-foreground space-y-1">
                <div>
                  COORDENADAS: {Number(poi.lat).toFixed(4)}, {Number(poi.lng).toFixed(4)}
                </div>
                <div>ID: #{String(poi.id || poi._id).slice(-6)}</div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
                  <span>ESTADO: ACTIVO</span>
                </div>
              </div>
            </div>

            {/* Events Section */}
            <div className="space-y-4 border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-mono text-secondary glow-text-violet">
                  <Sparkles size={16} />
                  <span>EVENTOS</span>
                </div>
                {user?.role === 'admin' && (
                  <Button size="sm" onClick={() => setShowEventForm(!showEventForm)}>
                    {showEventForm ? 'Cancelar' : 'Marcar Evento'}
                  </Button>
                )}
              </div>

              {showEventForm && (
                <div className="space-y-2">
                  <Textarea
                    value={newEvent}
                    onChange={(e) => setNewEvent(e.target.value)}
                    placeholder="Describe el evento..."
                    className="font-mono"
                  />
                  <Button onClick={handleAddEvent}>Guardar Evento</Button>
                </div>
              )}

              <div className="space-y-2">
                {events.map(event => (
                  <div key={event._id} className="text-sm p-2 bg-secondary/10 border-l-2 border-secondary rounded">
                    {editingEventId === event._id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editingEventContent}
                          onChange={(e) => setEditingEventContent(e.target.value)}
                          className="font-mono"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleUpdateEvent(event._id)}>Guardar</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingEventId(null)}>Cancelar</Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="whitespace-pre-wrap">{event.content}</p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-muted-foreground">
                            - {event.createdBy?.username || 'Admin'} el {new Date(event.createdAt).toLocaleDateString()}
                          </p>
                          {user?.role === 'admin' && (
                            <div className="flex gap-2">
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditingEventId(event._id); setEditingEventContent(event.content); }}>
                                <Edit size={12} />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteEvent(event._id)}>
                                <Trash2 size={12} />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {events.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">No hay eventos marcados en esta ubicación.</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col md:flex-rowgap-3 pt-4 border-t border-border">
              <Button 
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-mono border-glow-green"
                onClick={() => setShowGallery(!showGallery)}
              >
                <Eye className="mr-2" size={16} />
                REVELAR PISTAS
                {showGallery ? <ChevronUp className="ml-2" size={16} /> : <ChevronDown className="ml-2" size={16} />}
              </Button>
            </div>

            {/* Image Gallery - Expandable */}
            {showGallery && (
              <div className="mt-6 space-y-4 animate-fade-in border-t border-primary/30 pt-6">
                <div className="flex items-center gap-2 text-sm font-mono text-accent">
                  <Eye size={16} />
                  <span>EVIDENCIA VISUAL • {images.length} IMAGEN(ES)</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {images.map((img, idx) => (
                    <div 
                      key={idx} 
                      className="relative group overflow-hidden rounded border-2 border-primary/30 hover:border-accent transition-all cursor-pointer"
                      onClick={() => setSelectedImage(img)}
                    >
                      <img 
                        src={img} 
                        alt={`Pista ${idx + 1}`} 
                        className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          // Si falla Street View, mostrar imagen placeholder
                          e.target.src = `https://via.placeholder.com/600x400/1a1a1a/00ff88?text=${encodeURIComponent(poi.name)}`;
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                        <span className="text-xs font-mono text-primary">
                          PISTA #{idx + 1} • CLICK PARA AMPLIAR
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground font-mono text-center italic border-t border-border pt-3">
                  {poi.images && poi.images.length > 0 
                    ? "Imágenes cargadas por el Narrador" 
                    : "Vista de Street View • Google Maps"}
                </div>
              </div>
            )}
          </div>

          {/* Footer with mystical decoration */}
          <div className="border-t border-primary/30 p-4 bg-primary/5">
            <div className="flex items-center justify-center gap-4 text-xs font-mono text-primary/50">
              <div>∴</div>
              <div>LA REALIDAD ES MALEABLE</div>
              <div>∴</div>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox para ver imagen ampliada */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-background/95 backdrop-blur-md animate-fade-in"
          onClick={() => setSelectedImage(null)}
        >
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setSelectedImage(null)} 
            className="absolute top-4 right-4 text-primary hover:text-primary/80 z-10"
          >
            <X size={32} />
          </Button>
          <img 
            src={selectedImage} 
            alt="Imagen ampliada" 
            className="max-w-full max-h-full object-contain border-2 border-primary/50 rounded"
          />
        </div>
      )}
    </>
  );
};

export default POIModal;