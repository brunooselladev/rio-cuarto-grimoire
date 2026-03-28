import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible.tsx';
import { ChevronsUpDown, Plus, MessageSquare, Edit, Trash2, Brain, Sparkles, Zap, Eye, EyeOff, RefreshCw } from 'lucide-react';
import AvatarSprite from '@/components/AvatarSprite.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { useToast } from '@/hooks/use-toast.js';
import { useAuth } from '@/contexts/AuthContext.jsx';

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
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');
  // Avatar state
  const [avatar, setAvatar] = useState(null);
  const [avatarForm, setAvatarForm] = useState(null);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [avatarNoteText, setAvatarNoteText] = useState('');
  const [savingAvatarNote, setSavingAvatarNote] = useState(false);
  const [invokeMsg, setInvokeMsg] = useState('');
  const [invokingAvatar, setInvokingAvatar] = useState(false);
  // Player memory state
  const [memories, setMemories] = useState([]);
  const [memoriesLoaded, setMemoriesLoaded] = useState(false);
  const [newMemoryText, setNewMemoryText] = useState('');
  const [savingMemory, setSavingMemory] = useState(false);
  const [generatingMemory, setGeneratingMemory] = useState(false);
  const [genHistoryText, setGenHistoryText] = useState('');
  const [showGenModal, setShowGenModal] = useState(false);
  const [genPreview, setGenPreview] = useState([]);
  const { toast } = useToast();
  const { authFetch } = useAuth();

  const handleEditNote = (note) => {
    setEditingNoteId(note._id);
    setEditingNoteContent(note.content);
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditingNoteContent('');
  };

  const handleUpdateNote = async (noteId) => {
    try {
      const response = await authFetch(`/api/notes/${noteId}`, {
        method: 'PUT',
        body: JSON.stringify({ content: editingNoteContent }),
      });

      if (!response.ok) throw new Error('Failed to update note');

      const updatedNote = await response.json();
      setNotes(notes.map(n => (n._id === noteId ? updatedNote : n)));
      handleCancelEdit();
      toast({ title: 'Nota actualizada' });
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta nota?')) return;

    try {
      const response = await authFetch(`/api/notes/${noteId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete note');

      setNotes(notes.filter(n => n._id !== noteId));
      toast({ title: 'Nota eliminada' });
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  useEffect(() => {
    const fetchNotes = async () => {
      if (isOpen && sheet.user?._id) {
        setIsLoadingNotes(true);
        try {
          const response = await authFetch(`/api/notes/${sheet.user._id}`);
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

    const fetchMemories = async () => {
      if (isOpen && sheet.user?._id && !memoriesLoaded) {
        try {
          const response = await authFetch(`/api/players/${sheet.user._id}/memory`);
          if (!response.ok) return;
          const data = await response.json();
          setMemories(Array.isArray(data.entries) ? data.entries : []);
          setMemoriesLoaded(true);
        } catch { /* silent */ }
      }
    };

    const fetchAvatar = async () => {
      if (isOpen && sheet.user?._id) {
        try {
          const r = await authFetch(`/api/avatars/${sheet.user._id}`);
          if (!r.ok) return;
          const data = await r.json();
          setAvatar(data);
          if (data && !avatarForm) {
            setAvatarForm({
              name: data.name || '',
              colorPrimary: data.colorPrimary || '#a78bfa',
              colorSecondary: data.colorSecondary || '#7c3aed',
              personality: data.personality || '',
              lore: data.lore || '',
              rulesContext: data.rulesContext || '',
              sessionInstructions: data.sessionInstructions || '',
            });
          }
        } catch { /* silent */ }
      }
    };

    fetchNotes();
    fetchMemories();
    fetchAvatar();
  }, [isOpen, sheet.user?._id, authFetch, toast]);

  const handleSaveNote = async () => {
    if (!newNote.trim()) return;

    try {
      const response = await authFetch('/api/notes', {
        method: 'POST',
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

  const handleAddMemory = async () => {
    if (!newMemoryText.trim()) return;
    setSavingMemory(true);
    try {
      const r = await authFetch(`/api/players/${sheet.user._id}/memory`, {
        method: 'POST',
        body: JSON.stringify({ content: newMemoryText }),
      });
      if (!r.ok) throw new Error('Failed to save memory');
      const data = await r.json();
      setMemories(Array.isArray(data.entries) ? data.entries : []);
      setNewMemoryText('');
      toast({ title: 'Memoria guardada' });
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSavingMemory(false);
    }
  };

  const handleDeleteMemory = async (entryId) => {
    try {
      const r = await authFetch(`/api/players/${sheet.user._id}/memory/${entryId}`, { method: 'DELETE' });
      if (!r.ok) throw new Error('Failed to delete');
      setMemories((prev) => prev.filter((e) => e._id !== entryId));
      toast({ title: 'Memoria eliminada' });
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleGenerateMemory = async () => {
    if (!genHistoryText.trim()) return;
    setGeneratingMemory(true);
    setGenPreview([]);
    try {
      const lines = genHistoryText.split('\n').filter(Boolean);
      const history = lines.map((l) => {
        const isWizard = l.startsWith('Mago:');
        return { role: isWizard ? 'assistant' : 'user', content: l.replace(/^(Mago:|Jugador:)\s*/i, '') };
      });
      const r = await authFetch(`/api/players/${sheet.user._id}/memory/generate`, {
        method: 'POST',
        body: JSON.stringify({ history }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Error generando memorias');
      setGenPreview(data.generated || []);
      // Reload memories
      const r2 = await authFetch(`/api/players/${sheet.user._id}/memory`);
      if (r2.ok) {
        const d = await r2.json();
        setMemories(Array.isArray(d.entries) ? d.entries : []);
      }
      toast({ title: `${(data.generated || []).length} memoria(s) generada(s)` });
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setGeneratingMemory(false);
    }
  };

  if (!sheet) return null;

  return (
    <Card className="border-secondary/30 font-mono">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="flex flex-row items-center justify-between cursor-pointer">
          <div>
            <CardTitle
              className="text-[#e4b9ff] font-semibold"
              style={{
                textShadow: '0 0 6px #c67aff, 0 0 14px #b34dff, 0 0 26px #a600ff',
              }}
            >
              {sheet.user?.username
                ? sheet.user.username.charAt(0).toUpperCase() + sheet.user.username.slice(1)
                : 'Jugador Desconocido'}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{sheet.name || 'Sin nombre de personaje'}</p>
          </div>
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

            {/* Merits */}
            <div className="space-y-2">
              <h4 className="font-bold text-lg text-accent">Méritos</h4>
              {sheet.advantages?.merits?.map((merit, index) => (
                <DotRating key={index} label={merit.name} value={merit.value} />
              ))}
            </div>

            {/* Flaws */}
            <div className="space-y-2">
              <h4 className="font-bold text-lg text-accent">Defectos</h4>
              {sheet.advantages?.flaws?.map((flaw, index) => (
                <DotRating key={index} label={flaw.name} value={flaw.value} />
              ))}
            </div>

            {/* Other Traits */}
            <div className="space-y-2">
              <h4 className="font-bold text-lg text-accent">Otros Rasgos</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{sheet.otherTraits || 'No especificado'}</p>
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
                        {editingNoteId === note._id ? (
                          <div className="space-y-2">
                            <Textarea
                              value={editingNoteContent}
                              onChange={(e) => setEditingNoteContent(e.target.value)}
                              className="font-mono"
                            />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleUpdateNote(note._id)}>Guardar</Button>
                              <Button size="sm" variant="ghost" onClick={handleCancelEdit}>Cancelar</Button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p className="whitespace-pre-wrap">{note.content}</p>
                            <div className="flex items-center justify-between mt-1">
                              <p className="text-xs text-muted-foreground">
                                - {note.admin?.username || 'Admin'} el {new Date(note.createdAt).toLocaleDateString()}
                              </p>
                              <div className="flex gap-2">
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEditNote(note)}>
                                  <Edit size={12} />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteNote(note._id)}>
                                  <Trash2 size={12} />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
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

            {/* ── Memoria del Mago ── */}
            <div className="space-y-2 pt-4 border-t border-border">
              <h4 className="font-bold text-lg text-secondary flex items-center">
                <Brain className="mr-2" size={18} />
                Memoria del Mago
              </h4>
              <div className="space-y-2">
                {memories.map((entry) => (
                  <div key={entry._id} className="flex items-start gap-2 p-2 bg-secondary/5 border border-secondary/20 rounded text-sm">
                    <div className="flex-1">
                      <p className="font-mono text-xs leading-5">{entry.content}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="font-mono text-[10px] border-secondary/40 text-secondary/70">
                          {entry.source === 'ai_generated' ? '✦ IA' : 'Narrador'}
                        </Badge>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {new Date(entry.createdAt).toLocaleDateString('es-AR')}
                        </span>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-destructive/60 hover:text-destructive"
                      onClick={() => handleDeleteMemory(entry._id)}>
                      <Trash2 size={12} />
                    </Button>
                  </div>
                ))}
                {memories.length === 0 && (
                  <p className="font-mono text-xs text-muted-foreground italic">Sin memorias todavía.</p>
                )}
              </div>
              <div className="flex gap-2 pt-2">
                <Textarea
                  value={newMemoryText}
                  onChange={(e) => setNewMemoryText(e.target.value)}
                  placeholder="Agregar memoria manual..."
                  className="font-mono text-xs"
                  rows={2}
                />
                <Button size="sm" disabled={savingMemory || !newMemoryText.trim()} onClick={handleAddMemory} className="shrink-0">
                  <Plus size={14} />
                </Button>
              </div>
              <Button size="sm" variant="outline" className="font-mono text-secondary border-secondary/40"
                onClick={() => { setShowGenModal((v) => !v); setGenPreview([]); }}>
                <Sparkles size={14} className="mr-2" />
                Generar con IA
              </Button>
              {showGenModal && (
                <div className="space-y-2 p-3 border border-secondary/20 rounded bg-background/50">
                  <p className="font-mono text-xs text-muted-foreground">
                    Pegá el historial de conversación (una línea por turno, empezando con "Jugador:" o "Mago:"):
                  </p>
                  <Textarea
                    value={genHistoryText}
                    onChange={(e) => setGenHistoryText(e.target.value)}
                    placeholder={"Jugador: ¿Quién está vigilando el hospital?\nMago: La Technocracia... o lo que queda de ella."}
                    rows={5}
                    className="font-mono text-xs"
                  />
                  <Button size="sm" disabled={generatingMemory || !genHistoryText.trim()} onClick={handleGenerateMemory}
                    className="bg-secondary text-secondary-foreground font-mono">
                    {generatingMemory ? 'Generando...' : 'Generar y guardar'}
                  </Button>
                  {genPreview.length > 0 && (
                    <div className="space-y-1 pt-2">
                      <p className="font-mono text-xs text-secondary">Memorias generadas:</p>
                      {genPreview.map((m, i) => (
                        <p key={i} className="font-mono text-xs text-foreground">✦ {m}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Avatar del Jugador ── */}
            <div className="space-y-3 pt-4 border-t border-border">
              <h4 className="font-bold text-lg text-[#a78bfa] flex items-center">
                <Zap className="mr-2" size={18} />
                Avatar
              </h4>

              {avatarForm && (
                <div className="space-y-3">
                  {/* Preview */}
                  <div className="flex items-center gap-4">
                    <AvatarSprite
                      size={64}
                      colorPrimary={avatarForm.colorPrimary}
                      colorSecondary={avatarForm.colorSecondary}
                    />
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={avatarForm.name}
                        onChange={(e) => setAvatarForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder="Nombre del Avatar"
                        className="w-full bg-transparent font-mono text-sm text-[#a78bfa] border-b border-[#a78bfa]/40 outline-none pb-1"
                      />
                      <div className="flex items-center gap-3">
                        <label className="font-mono text-[10px] text-muted-foreground uppercase">Color primario</label>
                        <input type="color" value={avatarForm.colorPrimary}
                          onChange={(e) => setAvatarForm((f) => ({ ...f, colorPrimary: e.target.value }))}
                          className="h-7 w-12 rounded border-none cursor-pointer bg-transparent" />
                        <label className="font-mono text-[10px] text-muted-foreground uppercase">Secundario</label>
                        <input type="color" value={avatarForm.colorSecondary}
                          onChange={(e) => setAvatarForm((f) => ({ ...f, colorSecondary: e.target.value }))}
                          className="h-7 w-12 rounded border-none cursor-pointer bg-transparent" />
                      </div>
                    </div>
                  </div>

                  <Textarea value={avatarForm.personality}
                    onChange={(e) => setAvatarForm((f) => ({ ...f, personality: e.target.value }))}
                    placeholder="Personalidad del Avatar..." rows={2} className="font-mono text-xs" />
                  <Textarea value={avatarForm.lore}
                    onChange={(e) => setAvatarForm((f) => ({ ...f, lore: e.target.value }))}
                    placeholder="Historia / Lore del Avatar..." rows={2} className="font-mono text-xs" />
                  <Textarea value={avatarForm.rulesContext}
                    onChange={(e) => setAvatarForm((f) => ({ ...f, rulesContext: e.target.value }))}
                    placeholder="Contexto de reglas (Esferas, Arete, etc.)..." rows={2} className="font-mono text-xs" />
                  <Textarea value={avatarForm.sessionInstructions}
                    onChange={(e) => setAvatarForm((f) => ({ ...f, sessionInstructions: e.target.value }))}
                    placeholder="Instrucciones especiales para esta sesión..." rows={2} className="font-mono text-xs" />

                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" disabled={savingAvatar} onClick={async () => {
                      setSavingAvatar(true);
                      try {
                        const r = await authFetch(`/api/avatars/${sheet.user._id}`, {
                          method: 'PUT',
                          body: JSON.stringify(avatarForm),
                        });
                        const data = await r.json();
                        setAvatar(data);
                        toast({ title: 'Avatar guardado' });
                      } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
                      finally { setSavingAvatar(false); }
                    }} className="font-mono text-xs bg-[#7c3aed] text-white">
                      {savingAvatar ? 'Guardando...' : 'Guardar Avatar'}
                    </Button>

                    <Button size="sm" variant="outline" className="font-mono text-xs border-[#a78bfa]/40 text-[#a78bfa]"
                      onClick={async () => {
                        try {
                          const r = await authFetch(`/api/avatars/${sheet.user._id}/sync-character`, { method: 'POST' });
                          const data = await r.json();
                          setAvatar(data);
                          toast({ title: 'Snapshot sincronizado' });
                        } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
                      }}>
                      <RefreshCw size={12} className="mr-1" /> Sincronizar Personaje
                    </Button>
                  </div>

                  {/* Character snapshot preview */}
                  {avatar?.characterSnapshot && (
                    <p className="font-mono text-[10px] text-muted-foreground border border-[#a78bfa]/20 rounded p-2">
                      {avatar.characterSnapshot}
                    </p>
                  )}
                </div>
              )}

              {!avatarForm && (
                <Button size="sm" variant="outline" className="font-mono text-xs border-[#a78bfa]/40 text-[#a78bfa]"
                  onClick={() => setAvatarForm({ name: '', colorPrimary: '#a78bfa', colorSecondary: '#7c3aed', personality: '', lore: '', rulesContext: '', sessionInstructions: '' })}>
                  <Plus size={12} className="mr-1" /> Crear Avatar
                </Button>
              )}

              {/* Invocación */}
              {avatar && (
                <div className="space-y-2 pt-2 border-t border-[#a78bfa]/20">
                  <p className="font-mono text-[11px] uppercase tracking-widest text-[#a78bfa]/70">Invocar Avatar</p>
                  <div className="flex gap-2 items-start">
                    <Textarea
                      value={invokeMsg}
                      onChange={(e) => setInvokeMsg(e.target.value)}
                      placeholder="Mensaje de invocación (aparece al jugador)..."
                      rows={2}
                      className="font-mono text-xs flex-1"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" disabled={invokingAvatar} onClick={async () => {
                      setInvokingAvatar(true);
                      try {
                        await authFetch(`/api/avatars/${sheet.user._id}/activate`, {
                          method: 'PUT',
                          body: JSON.stringify({ isActive: true, message: invokeMsg }),
                        });
                        toast({ title: 'Avatar invocado' });
                        setInvokeMsg('');
                      } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
                      finally { setInvokingAvatar(false); }
                    }} className="font-mono text-xs bg-[#7c3aed] text-white">
                      <Eye size={12} className="mr-1" /> Invocar
                    </Button>
                    <Button size="sm" variant="outline" className="font-mono text-xs border-destructive/40 text-destructive"
                      disabled={invokingAvatar}
                      onClick={async () => {
                        try {
                          await authFetch(`/api/avatars/${sheet.user._id}/activate`, {
                            method: 'PUT',
                            body: JSON.stringify({ isActive: false, message: '' }),
                          });
                          toast({ title: 'Avatar desactivado' });
                        } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
                      }}>
                      <EyeOff size={12} className="mr-1" /> Desactivar
                    </Button>
                  </div>
                  {/* Avatar notes */}
                  <div className="space-y-1 pt-2">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-[#a78bfa]/50">Notas del Avatar</p>
                    {(avatar.notes || []).map((n) => (
                      <div key={n._id} className="flex items-center gap-2 text-xs">
                        <span className="flex-1 font-mono text-[11px] text-foreground/80">{n.content}</span>
                        <button type="button" className="text-destructive/60 hover:text-destructive"
                          onClick={async () => {
                            try {
                              await authFetch(`/api/avatars/${sheet.user._id}/notes/${n._id}`, { method: 'DELETE' });
                              setAvatar((a) => ({ ...a, notes: a.notes.filter((x) => x._id !== n._id) }));
                            } catch { /* silent */ }
                          }}>
                          <Trash2 size={10} />
                        </button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={avatarNoteText}
                        onChange={(e) => setAvatarNoteText(e.target.value)}
                        placeholder="Nueva nota..."
                        className="flex-1 bg-transparent font-mono text-xs outline-none border-b border-[#a78bfa]/30 pb-0.5"
                      />
                      <button type="button" disabled={savingAvatarNote || !avatarNoteText.trim()}
                        className="font-mono text-xs text-[#a78bfa] disabled:opacity-30"
                        onClick={async () => {
                          setSavingAvatarNote(true);
                          try {
                            const r = await authFetch(`/api/avatars/${sheet.user._id}/notes`, {
                              method: 'POST',
                              body: JSON.stringify({ content: avatarNoteText }),
                            });
                            const data = await r.json();
                            setAvatar(data);
                            setAvatarNoteText('');
                          } catch { /* silent */ }
                          finally { setSavingAvatarNote(false); }
                        }}>+</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default PlayerCard;
