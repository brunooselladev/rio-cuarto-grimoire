import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible.tsx';
import { ChevronsUpDown, Plus, MessageSquare } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea.jsx';
import { useToast } from '@/hooks/use-toast.js';

const DotRating = ({ label, value, max = 5 }) => (
  <div className="flex items-center justify-between">
    <span className="font-mono text-sm capitalize">{label}</span>
    <div className="flex items-center gap-1.5">
      {[...Array(max)].map((_, i) => (
        <div
          key={i}
          className={`h-3 w-3 rounded-full border border-primary/50 ${i < value ? 'bg-primary' : 'bg-background'}`}>
        </div>
      ))}
    </div>
  </div>
);

const PlayerCard = ({ sheet }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [showNewNote, setShowNewNote] = useState(false);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const { toast } = useToast();
  const token = localStorage.getItem('authToken');

  useEffect(() => {
    const fetchNotes = async () => {
      if (isOpen && sheet.user?._id) {
        setIsLoadingNotes(true);
        try {
          const response = await fetch(`/api/notes/${sheet.user._id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!response.ok) throw new Error('Failed to fetch notes');
          const data = await response.json();
          setNotes(data);
        } catch (error) {
          toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
          setIsLoadingNotes(false);
        }
      }
    };

    fetchNotes();
  }, [isOpen, sheet.user?._id, token, toast]);

  const handleSaveNote = async () => {
    if (!newNote.trim()) return;

    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          playerId: sheet.user._id,
          content: newNote,
        }),
      });

      if (!response.ok) throw new Error('Failed to save note');

      const savedNote = await response.json();
      setNotes([...notes, savedNote]);
      setNewNote('');
      setShowNewNote(false);
      toast({ title: 'Nota guardada', description: 'La nota ha sido agregada al jugador.' });
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  if (!sheet) return null;

  return (
    <Card className="border-secondary/30 font-mono">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="flex flex-row items-center justify-between cursor-pointer">
          <CardTitle className="text-secondary glow-text-violet">{sheet.user?.username || 'Jugador Desconocido'}</CardTitle>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-9 p-0">
              <ChevronsUpDown className="h-4 w-4" />
              <span className="sr-only">Toggle</span>
            </Button>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Spheres */}
            <div className="space-y-2">
              <h4 className="font-bold text-lg text-accent">Esferas</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                {sheet.spheres && Object.entries(sheet.spheres).map(([sphere, value]) => (
                  <DotRating key={sphere} label={sphere} value={value} />
                ))}
              </div>
            </div>

            {/* Backgrounds */}
            <div className="space-y-2">
              <h4 className="font-bold text-lg text-accent">Trasfondos</h4>
              {sheet.advantages?.backgrounds?.map((bg, index) => (
                <DotRating key={index} label={bg.name} value={bg.value} />
              ))}
            </div>

            {/* Merits and Flaws */}
            <div className="space-y-2">
              <h4 className="font-bold text-lg text-accent">Méritos y Defectos</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{sheet.advantages?.merits_flaws || 'No especificado'}</p>
            </div>

            {/* Admin Notes */}
            <div className="space-y-2 pt-4 border-t border-border">
              <h4 className="font-bold text-lg text-accent flex items-center">
                <MessageSquare className="mr-2" size={18}/>
                Notas del Narrador
              </h4>
              {isLoadingNotes ? (
                <p className="text-xs text-muted-foreground italic">Cargando notas...</p>
              ) : (
                <div className="space-y-2">
                  {notes.length > 0 ? (
                    notes.map(note => (
                      <div key={note._id} className="text-sm p-2 bg-secondary/10 border-l-2 border-secondary rounded">
                        <p className="whitespace-pre-wrap">{note.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          - {note.admin?.username || 'Admin'} el {new Date(note.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Aún no hay notas para este jugador.</p>
                  )}
                </div>
              )}

              {showNewNote ? (
                <div className="space-y-2 pt-2">
                  <Textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Escribe una nueva nota..."
                    className="font-mono"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveNote}>Guardar Nota</Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowNewNote(false)}>Cancelar</Button>
                  </div>
                </div>
              ) : (
                <Button size="sm" variant="outline" className="mt-2" onClick={() => setShowNewNote(true)}>
                  <Plus className="mr-2" size={14} />
                  Agregar Nota
                </Button>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default PlayerCard;
