import { useEffect, useState } from 'react';
import { Sparkles, Plus, Trash2, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';

import { useToast } from '@/hooks/use-toast.js';
import { useWizard } from '@/contexts/WizardContext.jsx';
import { getWizardHeaders, joinWizardLines, parseWizardLines } from '@/lib/wizard.js';

const buildUrgentForm = (wizardState) => ({
  active: Boolean(wizardState?.urgentMessage?.active),
  text: wizardState?.urgentMessage?.text || '',
});

const buildHiddenForm = (wizardState) => ({
  active: Boolean(wizardState?.hidden?.active),
  location: wizardState?.hidden?.location || 'map',
  mode: wizardState?.hidden?.mode || 'topics',
  topicsText: joinWizardLines(wizardState?.hidden?.topics),
  examplePhrasesText: joinWizardLines(wizardState?.hidden?.examplePhrases),
  systemPrompt: wizardState?.hidden?.systemPrompt || '',
  rulesContext: wizardState?.hidden?.rulesContext || '',
  lore: wizardState?.hidden?.lore || '',
  puzzleActive: Boolean(wizardState?.hidden?.puzzle?.active),
  puzzleDescription: wizardState?.hidden?.puzzle?.description || '',
  puzzleSello: wizardState?.hidden?.puzzle?.sello || '',
});

const inputClassName =
  'w-full rounded-md border border-primary/30 bg-background/80 px-3 py-2 font-mono text-sm text-foreground';

const modeCardClassName =
  'block w-full rounded-md border px-4 py-3 transition-colors cursor-pointer';

const AdminWizardPanel = () => {
  const { wizardState, refreshWizard } = useWizard();
  const { toast } = useToast();
  const [urgentForm, setUrgentForm] = useState(() => buildUrgentForm(wizardState));
  const [hiddenForm, setHiddenForm] = useState(() => buildHiddenForm(wizardState));
  const [urgentDirty, setUrgentDirty] = useState(false);
  const [hiddenDirty, setHiddenDirty] = useState(false);
  const [savingUrgent, setSavingUrgent] = useState(false);
  const [savingHidden, setSavingHidden] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState(null);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    fetch('/api/events', { headers: getWizardHeaders() })
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setEvents(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!urgentDirty) setUrgentForm(buildUrgentForm(wizardState));
  }, [urgentDirty, wizardState]);

  useEffect(() => {
    if (!hiddenDirty) setHiddenForm(buildHiddenForm(wizardState));
  }, [hiddenDirty, wizardState]);

  const handleUrgentSave = async () => {
    setSavingUrgent(true);
    try {
      const currentText = (wizardState?.urgentMessage?.text || '').trim();
      const nextText = urgentForm.text.trim();
      const shouldResetDismissals =
        nextText !== currentText || (urgentForm.active && !wizardState?.urgentMessage?.active);
      const payload = {
        urgentMessage: {
          active: urgentForm.active,
          text: urgentForm.text,
          ...(shouldResetDismissals ? { dismissedBy: [] } : {}),
        },
      };
      const response = await fetch('/api/wizard', {
        method: 'PUT',
        headers: getWizardHeaders({ includeJson: true }),
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('No se pudo guardar el mensaje urgente');
      await refreshWizard();
      setUrgentDirty(false);
      toast({
        title: 'Mensaje urgente guardado',
        description: shouldResetDismissals
          ? 'Se reiniciaron las lecturas previas para el nuevo mensaje.'
          : 'La configuracion del mensaje urgente fue actualizada.',
      });
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSavingUrgent(false);
    }
  };

  const handleHiddenSave = async () => {
    setSavingHidden(true);
    try {
      const payload = {
        hidden: {
          active: hiddenForm.active,
          location: hiddenForm.location,
          mode: hiddenForm.mode,
          topics: parseWizardLines(hiddenForm.topicsText),
          examplePhrases: parseWizardLines(hiddenForm.examplePhrasesText),
          systemPrompt: hiddenForm.systemPrompt,
          rulesContext: hiddenForm.rulesContext,
          lore: hiddenForm.lore,
          puzzle: {
            active: hiddenForm.puzzleActive,
            description: hiddenForm.puzzleDescription,
            sello: hiddenForm.puzzleSello,
          },
        },
      };
      const response = await fetch('/api/wizard', {
        method: 'PUT',
        headers: getWizardHeaders({ includeJson: true }),
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('No se pudo guardar la configuracion del mago');
      await refreshWizard();
      setHiddenDirty(false);
      toast({ title: 'Mago oculto actualizado' });
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSavingHidden(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNoteText.trim()) return;
    setSavingNote(true);
    try {
      const response = await fetch('/api/wizard/notes', {
        method: 'POST',
        headers: getWizardHeaders({ includeJson: true }),
        body: JSON.stringify({ content: newNoteText }),
      });
      if (!response.ok) throw new Error('No se pudo guardar la nota');
      await refreshWizard();
      setNewNoteText('');
      toast({ title: 'Nota agregada al conocimiento del mago' });
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    setDeletingNoteId(noteId);
    try {
      const response = await fetch(`/api/wizard/notes/${noteId}`, {
        method: 'DELETE',
        headers: getWizardHeaders(),
      });
      if (!response.ok) throw new Error('No se pudo eliminar la nota');
      await refreshWizard();
      toast({ title: 'Nota eliminada' });
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setDeletingNoteId(null);
    }
  };

  return (
    <div className="space-y-6 mt-6">

      {/* ── Mensaje Urgente ── */}
      <Card className="border-primary/40 bg-card/80">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-primary font-mono">
                <Sparkles size={18} />
                Mensaje Urgente
              </CardTitle>
              <CardDescription className="font-mono">
                Bloquea la interfaz del jugador hasta que termine de leer y confirme.
              </CardDescription>
            </div>
            <Badge variant="outline" className="font-mono border-secondary/50 text-secondary">
              Leido por {wizardState?.urgentMessage?.dismissedBy?.length || 0} jugador(es)
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between rounded-md border border-primary/20 bg-background/50 px-4 py-3">
            <div>
              <div className="font-mono text-sm text-primary">Mensaje activo</div>
              <div className="font-mono text-xs text-muted-foreground">
                Si esta encendido, los jugadores veran el overlay en cualquier ruta.
              </div>
            </div>
            <button
              type="button"
              onClick={() => { setUrgentForm((c) => ({ ...c, active: !c.active })); setUrgentDirty(true); }}
              className="font-mono text-xs px-3 py-1.5 rounded border transition-colors"
              style={urgentForm.active
                ? { background: '#00ff9d', color: '#000', borderColor: '#00ff9d' }
                : { background: '#333', color: '#aaa', borderColor: '#555' }}
            >
              {urgentForm.active ? 'ACTIVO' : 'INACTIVO'}
            </button>
          </div>
          <div className="space-y-2">
            <Label className="font-mono text-xs uppercase tracking-[0.24em]">Texto del mensaje</Label>
            <Textarea
              value={urgentForm.text}
              onChange={(e) => { setUrgentForm((c) => ({ ...c, text: e.target.value })); setUrgentDirty(true); }}
              rows={6} className="font-mono"
              placeholder="Escribi aqui el mensaje que pronunciara el mago para toda la mesa."
            />
            <div className="font-mono text-xs text-muted-foreground">
              Si cambias el texto o reactivas el mensaje, se reinicia la lista de jugadores que ya lo habian leido.
            </div>
          </div>
          <Button type="button" onClick={handleUrgentSave} disabled={savingUrgent} className="bg-primary text-primary-foreground font-mono">
            {savingUrgent ? 'Guardando...' : 'Guardar mensaje urgente'}
          </Button>
        </CardContent>
      </Card>

      {/* ── Mago Oculto ── */}
      <Card className="border-accent/40 bg-card/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-accent font-mono">
            <Sparkles size={18} />
            Mago Oculto
          </CardTitle>
          <CardDescription className="font-mono">
            Aparece como sprite flotante en una seccion y habla con IA al hacer click.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between rounded-md border border-accent/20 bg-background/50 px-4 py-3">
            <div>
              <div className="font-mono text-sm text-accent">Mago oculto activo</div>
              <div className="font-mono text-xs text-muted-foreground">
                Visible solo en la seccion configurada cuando un usuario autenticado la visite.
              </div>
            </div>
            <button
              type="button"
              onClick={() => { setHiddenForm((c) => ({ ...c, active: !c.active })); setHiddenDirty(true); }}
              className="font-mono text-xs px-3 py-1.5 rounded border transition-colors"
              style={hiddenForm.active
                ? { background: '#00d4ff', color: '#000', borderColor: '#00d4ff' }
                : { background: '#333', color: '#aaa', borderColor: '#555' }}
            >
              {hiddenForm.active ? 'ACTIVO' : 'INACTIVO'}
            </button>
          </div>

          <div className="space-y-2">
            <Label className="font-mono text-xs uppercase tracking-[0.24em]">Seccion</Label>
            <select
              value={hiddenForm.location}
              onChange={(e) => { setHiddenForm((c) => ({ ...c, location: e.target.value })); setHiddenDirty(true); }}
              className={inputClassName}
            >
              <option value="map">Mapa</option>
              <option value="panel">Panel</option>
              <option value="character">Hoja de personaje</option>
              <option value="events">Eventos</option>
            </select>
          </div>

          <div className="space-y-3">
            <Label className="font-mono text-xs uppercase tracking-[0.24em]">Modo de IA</Label>
            {[
              { value: 'topics', label: 'Topicos libres', desc: 'Le das lineamientos generales y el mago improvisa.', color: 'rgba(0,255,157,0.65)', bg: 'rgba(0,255,157,0.06)', textClass: 'text-primary' },
              { value: 'examples', label: 'Frases de ejemplo', desc: 'Mezcla topicos con ejemplos de voz para que el mago varie sobre esa base.', color: 'rgba(0,212,255,0.65)', bg: 'rgba(0,212,255,0.06)', textClass: 'text-accent' },
              { value: 'full_prompt', label: 'Prompt completo', desc: 'Tomas control total del system prompt del mago.', color: 'rgba(123,79,160,0.75)', bg: 'rgba(123,79,160,0.08)', textClass: 'text-secondary' },
            ].map(({ value, label, desc, color, bg, textClass }) => (
              <label key={value} className={modeCardClassName}
                style={{
                  borderColor: hiddenForm.mode === value ? color : 'rgba(255,255,255,0.08)',
                  background: hiddenForm.mode === value ? bg : 'rgba(0,0,0,0.18)',
                }}
              >
                <div className="flex items-start gap-3">
                  <input type="radio" name="wizard-mode" value={value} checked={hiddenForm.mode === value}
                    onChange={(e) => { setHiddenForm((c) => ({ ...c, mode: e.target.value })); setHiddenDirty(true); }}
                  />
                  <div>
                    <div className={`font-mono text-sm ${textClass}`}>{label}</div>
                    <div className="font-mono text-xs text-muted-foreground">{desc}</div>
                  </div>
                </div>
              </label>
            ))}
          </div>

          {(hiddenForm.mode === 'topics' || hiddenForm.mode === 'examples') && (
            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-[0.24em]">Instrucciones para esta sesion</Label>
              <Textarea
                value={hiddenForm.topicsText}
                onChange={(e) => { setHiddenForm((c) => ({ ...c, topicsText: e.target.value })); setHiddenDirty(true); }}
                rows={5} className="font-mono"
                placeholder="Un topico por linea. Ej: ser misterioso, preguntar por que no se conecta, mencionar la trama..."
              />
            </div>
          )}

          {hiddenForm.mode === 'examples' && (
            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-[0.24em]">Frases de ejemplo</Label>
              <Textarea
                value={hiddenForm.examplePhrasesText}
                onChange={(e) => { setHiddenForm((c) => ({ ...c, examplePhrasesText: e.target.value })); setHiddenDirty(true); }}
                rows={5} className="font-mono"
                placeholder="Una frase por linea. El modelo las tomara como referencia tonal."
              />
            </div>
          )}

          {hiddenForm.mode === 'full_prompt' && (
            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-[0.24em]">System prompt completo</Label>
              <Textarea
                value={hiddenForm.systemPrompt}
                onChange={(e) => { setHiddenForm((c) => ({ ...c, systemPrompt: e.target.value })); setHiddenDirty(true); }}
                rows={9} className="font-mono"
                placeholder="Defini aqui la voz completa del Mago Digital."
              />
            </div>
          )}

          {/* Reglas del juego */}
          <div className="space-y-2 border-t border-accent/10 pt-4">
            <Label className="font-mono text-xs uppercase tracking-[0.24em]">Reglas del juego</Label>
            <div className="font-mono text-xs text-muted-foreground mb-1">
              Conocimiento sobre Mago: La Ascension (M20) y variantes de esta cronica. El mago lo usa para responder preguntas de reglas.
            </div>
            <Textarea
              value={hiddenForm.rulesContext}
              onChange={(e) => { setHiddenForm((c) => ({ ...c, rulesContext: e.target.value })); setHiddenDirty(true); }}
              rows={6} className="font-mono"
              placeholder="Ej: En esta cronica usamos las reglas de M20. La Quintaesencia se recupera meditando en un Nodo durante una escena. El Paradox se acumula por magia vulgar frente a testigos..."
            />
          </div>

          {/* Trama de la cronica */}
          <div className="space-y-2">
            <Label className="font-mono text-xs uppercase tracking-[0.24em]">Trama de la cronica</Label>
            <div className="font-mono text-xs text-muted-foreground mb-1">
              Contexto narrativo permanente: faccciones, lugares, NPCs, arcos de historia. El mago lo incorpora a todas sus respuestas.
            </div>
            <Textarea
              value={hiddenForm.lore}
              onChange={(e) => { setHiddenForm((c) => ({ ...c, lore: e.target.value })); setHiddenDirty(true); }}
              rows={8} className="font-mono"
              placeholder="Ej: La cronica transcurre en Rio Cuarto, 2026. Los personajes son Magos recien Despertados. La Technocracia controla el hospital central. El Nodo principal esta en el sotano de la Biblioteca España..."
            />
          </div>

          {/* Puzzle — solo visible si el mago está activo */}
          {hiddenForm.active && (
            <div className="space-y-4 border-t border-accent/10 pt-4">
              <div className="font-mono text-xs uppercase tracking-[0.24em] text-accent">Modo Puzzle</div>
              <div className="font-mono text-xs text-muted-foreground mb-2">
                Mientras el puzzle está activo, el jugador no puede cerrar el mago hasta resolverlo. El sello es una palabra clave que fuerza el cierre sin pasar por la IA.
              </div>
              <div className="flex items-center justify-between rounded-md border border-accent/20 bg-background/50 px-4 py-3">
                <div>
                  <div className="font-mono text-sm text-accent">Puzzle activo</div>
                  <Badge variant="outline" className="font-mono text-xs mt-1 border-secondary/50 text-secondary">
                    Resuelto por {wizardState?.hidden?.puzzle?.solvedBy?.length || 0} jugador(es)
                  </Badge>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <button
                    type="button"
                    onClick={() => { setHiddenForm((c) => ({ ...c, puzzleActive: !c.puzzleActive })); setHiddenDirty(true); }}
                    className="font-mono text-xs px-3 py-1.5 rounded border transition-colors"
                    style={hiddenForm.puzzleActive
                      ? { background: '#7b4fa0', color: '#fff', borderColor: '#7b4fa0' }
                      : { background: '#333', color: '#aaa', borderColor: '#555' }}
                  >
                    {hiddenForm.puzzleActive ? 'ACTIVO' : 'INACTIVO'}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const r = await fetch('/api/wizard', {
                          method: 'PUT',
                          headers: getWizardHeaders({ includeJson: true }),
                          body: JSON.stringify({ hidden: { puzzle: { solvedBy: [] } } }),
                        });
                        if (!r.ok) throw new Error('No se pudo resetear');
                        await refreshWizard();
                        toast({ title: 'Resueltos reseteados' });
                      } catch (e) {
                        toast({ title: 'Error', description: e.message, variant: 'destructive' });
                      }
                    }}
                    className="font-mono text-[10px] px-2 py-1 rounded border border-destructive/40 text-destructive/70 hover:text-destructive transition-colors"
                  >
                    Resetear resueltos
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-[0.24em]">Descripción del enigma</Label>
                <Textarea
                  value={hiddenForm.puzzleDescription}
                  onChange={(e) => { setHiddenForm((c) => ({ ...c, puzzleDescription: e.target.value })); setHiddenDirty(true); }}
                  rows={4} className="font-mono"
                  placeholder="Escribí el enigma que el jugador debe resolver. El mago lo interpretará y evaluará las respuestas..."
                />
              </div>
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-[0.24em]">Sello de emergencia</Label>
                <input
                  type="text"
                  value={hiddenForm.puzzleSello}
                  onChange={(e) => { setHiddenForm((c) => ({ ...c, puzzleSello: e.target.value })); setHiddenDirty(true); }}
                  placeholder="Palabra clave secreta (solo se compara en el servidor)"
                  className={inputClassName}
                />
                <div className="font-mono text-xs text-muted-foreground">
                  Si el jugador escribe exactamente esta palabra, el cierre se fuerza sin consultar la IA. Nunca viaja al cliente.
                </div>
              </div>
            </div>
          )}

          <Button type="button" onClick={handleHiddenSave} disabled={savingHidden} className="bg-accent text-accent-foreground font-mono">
            {savingHidden ? 'Guardando...' : 'Guardar mago oculto'}
          </Button>
        </CardContent>
      </Card>

      {/* ── Notas del Narrador ── */}
      <Card className="border-secondary/40 bg-card/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-secondary font-mono">
            <Sparkles size={18} />
            Notas del Narrador
          </CardTitle>
          <CardDescription className="font-mono">
            Memoria acumulada del mago. Cada nota se incorpora permanentemente a su conocimiento hasta que la borres.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Agregar nota */}
          <div className="space-y-2">
            <Label className="font-mono text-xs uppercase tracking-[0.24em]">Nueva nota</Label>
            <Textarea
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              rows={3} className="font-mono"
              placeholder="Ej: Los jugadores descubrieron que el Dr. Vidal es un Technocrático. Aun no saben que trabaja para el Sindicato..."
            />
            <Button
              type="button"
              onClick={handleAddNote}
              disabled={savingNote || !newNoteText.trim()}
              className="font-mono bg-secondary text-secondary-foreground"
            >
              <Plus size={14} className="mr-2" />
              {savingNote ? 'Guardando...' : 'Agregar nota'}
            </Button>
          </div>

          {/* Lista de notas */}
          {wizardState?.notes?.length > 0 && (
            <div className="space-y-2 border-t border-secondary/10 pt-4">
              <div className="font-mono text-xs uppercase tracking-[0.24em] text-secondary mb-3">
                {wizardState.notes.length} nota(s) activa(s)
              </div>
              {[...wizardState.notes].reverse().map((note) => (
                <div
                  key={note._id}
                  className="flex items-start gap-3 rounded-md border border-secondary/20 bg-background/40 px-3 py-2"
                >
                  <div className="flex-1">
                    <div className="font-mono text-xs text-foreground leading-5">{note.content}</div>
                    <div className="font-mono text-[10px] text-muted-foreground mt-1">
                      {new Date(note.createdAt).toLocaleString('es-AR')}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteNote(note._id)}
                    disabled={deletingNoteId === note._id}
                    className="shrink-0 text-destructive/60 hover:text-destructive transition-colors mt-0.5"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {(!wizardState?.notes || wizardState.notes.length === 0) && (
            <div className="font-mono text-xs text-muted-foreground text-center py-4">
              No hay notas todavia. Las notas que agregues seran parte del conocimiento permanente del mago.
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Eventos de la Campaña ── */}
      <Card className="border-primary/20 bg-card/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary font-mono">
            <Calendar size={18} />
            Eventos de la Campaña
          </CardTitle>
          <CardDescription className="font-mono">
            El mago conoce automáticamente todos los eventos publicados. Los usa como contexto narrativo al hablar con los jugadores.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="font-mono text-xs text-muted-foreground text-center py-4">
              No hay eventos publicados todavia.
            </div>
          ) : (
            <div className="space-y-2">
              <div className="font-mono text-xs text-primary/70 mb-3">
                {events.length} evento(s) disponible(s) como contexto del mago
              </div>
              {events.slice(0, 10).map((ev) => (
                <div key={ev._id} className="rounded-md border border-primary/20 bg-background/40 px-3 py-2">
                  <div className="font-mono text-xs font-bold text-primary">{ev.title}</div>
                  <div className="font-mono text-xs text-muted-foreground mt-0.5 line-clamp-2">{ev.content}</div>
                  <div className="font-mono text-[10px] text-muted-foreground/60 mt-1">
                    {new Date(ev.createdAt).toLocaleDateString('es-AR')}
                  </div>
                </div>
              ))}
              {events.length > 10 && (
                <div className="font-mono text-xs text-muted-foreground text-center">...y {events.length - 10} más</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
};

export default AdminWizardPanel;
