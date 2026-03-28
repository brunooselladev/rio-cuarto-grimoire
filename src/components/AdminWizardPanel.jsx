import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Switch } from '@/components/ui/switch.tsx';
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
});

const inputClassName =
  'w-full rounded-md border border-primary/30 bg-background/80 px-3 py-2 font-mono text-sm text-foreground';

const modeCardClassName =
  'rounded-md border px-4 py-3 transition-colors';

const AdminWizardPanel = () => {
  const { wizardState, refreshWizard } = useWizard();
  const { toast } = useToast();
  const [urgentForm, setUrgentForm] = useState(() => buildUrgentForm(wizardState));
  const [hiddenForm, setHiddenForm] = useState(() => buildHiddenForm(wizardState));
  const [urgentDirty, setUrgentDirty] = useState(false);
  const [hiddenDirty, setHiddenDirty] = useState(false);
  const [savingUrgent, setSavingUrgent] = useState(false);
  const [savingHidden, setSavingHidden] = useState(false);

  useEffect(() => {
    if (!urgentDirty) {
      setUrgentForm(buildUrgentForm(wizardState));
    }
  }, [urgentDirty, wizardState]);

  useEffect(() => {
    if (!hiddenDirty) {
      setHiddenForm(buildHiddenForm(wizardState));
    }
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

      if (!response.ok) {
        throw new Error('No se pudo guardar el mensaje urgente');
      }

      await refreshWizard();
      setUrgentDirty(false);
      toast({
        title: 'Mensaje urgente guardado',
        description: shouldResetDismissals
          ? 'Se reiniciaron las lecturas previas para el nuevo mensaje.'
          : 'La configuracion del mensaje urgente fue actualizada.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo guardar el mensaje urgente',
        variant: 'destructive',
      });
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
        },
      };

      const response = await fetch('/api/wizard', {
        method: 'PUT',
        headers: getWizardHeaders({ includeJson: true }),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('No se pudo guardar la configuracion del mago oculto');
      }

      await refreshWizard();
      setHiddenDirty(false);
      toast({ title: 'Mago oculto actualizado' });
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo guardar la configuracion del mago oculto',
        variant: 'destructive',
      });
    } finally {
      setSavingHidden(false);
    }
  };

  return (
    <div className="space-y-6 mt-6">
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
            <Switch
              checked={urgentForm.active}
              onCheckedChange={(checked) => {
                setUrgentForm((current) => ({ ...current, active: checked }));
                setUrgentDirty(true);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label className="font-mono text-xs uppercase tracking-[0.24em]">Texto del mensaje</Label>
            <Textarea
              value={urgentForm.text}
              onChange={(event) => {
                setUrgentForm((current) => ({ ...current, text: event.target.value }));
                setUrgentDirty(true);
              }}
              rows={6}
              className="font-mono"
              placeholder="Escribi aqui el mensaje que pronunciara el mago para toda la mesa."
            />
            <div className="font-mono text-xs text-muted-foreground">
              Si cambias el texto o reactivas el mensaje, se reinicia la lista de jugadores que ya lo habian leido.
            </div>
          </div>

          <Button
            type="button"
            onClick={handleUrgentSave}
            disabled={savingUrgent}
            className="bg-primary text-primary-foreground font-mono"
          >
            {savingUrgent ? 'Guardando...' : 'Guardar mensaje urgente'}
          </Button>
        </CardContent>
      </Card>

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
            <Switch
              checked={hiddenForm.active}
              onCheckedChange={(checked) => {
                setHiddenForm((current) => ({ ...current, active: checked }));
                setHiddenDirty(true);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label className="font-mono text-xs uppercase tracking-[0.24em]">Seccion</Label>
            <select
              value={hiddenForm.location}
              onChange={(event) => {
                setHiddenForm((current) => ({ ...current, location: event.target.value }));
                setHiddenDirty(true);
              }}
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

            <label
              className={modeCardClassName}
              style={{
                borderColor: hiddenForm.mode === 'topics' ? 'rgba(0, 255, 157, 0.65)' : 'rgba(255, 255, 255, 0.08)',
                background: hiddenForm.mode === 'topics' ? 'rgba(0, 255, 157, 0.06)' : 'rgba(0, 0, 0, 0.18)',
              }}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="wizard-mode"
                  value="topics"
                  checked={hiddenForm.mode === 'topics'}
                  onChange={(event) => {
                    setHiddenForm((current) => ({ ...current, mode: event.target.value }));
                    setHiddenDirty(true);
                  }}
                />
                <div>
                  <div className="font-mono text-sm text-primary">Topicos libres</div>
                  <div className="font-mono text-xs text-muted-foreground">
                    Le das lineamientos generales y el mago improvisa.
                  </div>
                </div>
              </div>
            </label>

            <label
              className={modeCardClassName}
              style={{
                borderColor: hiddenForm.mode === 'examples' ? 'rgba(0, 212, 255, 0.65)' : 'rgba(255, 255, 255, 0.08)',
                background: hiddenForm.mode === 'examples' ? 'rgba(0, 212, 255, 0.06)' : 'rgba(0, 0, 0, 0.18)',
              }}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="wizard-mode"
                  value="examples"
                  checked={hiddenForm.mode === 'examples'}
                  onChange={(event) => {
                    setHiddenForm((current) => ({ ...current, mode: event.target.value }));
                    setHiddenDirty(true);
                  }}
                />
                <div>
                  <div className="font-mono text-sm text-accent">Frases de ejemplo</div>
                  <div className="font-mono text-xs text-muted-foreground">
                    Mezcla topicos con ejemplos de voz para que el mago varie sobre esa base.
                  </div>
                </div>
              </div>
            </label>

            <label
              className={modeCardClassName}
              style={{
                borderColor: hiddenForm.mode === 'full_prompt' ? 'rgba(123, 79, 160, 0.75)' : 'rgba(255, 255, 255, 0.08)',
                background: hiddenForm.mode === 'full_prompt' ? 'rgba(123, 79, 160, 0.08)' : 'rgba(0, 0, 0, 0.18)',
              }}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="wizard-mode"
                  value="full_prompt"
                  checked={hiddenForm.mode === 'full_prompt'}
                  onChange={(event) => {
                    setHiddenForm((current) => ({ ...current, mode: event.target.value }));
                    setHiddenDirty(true);
                  }}
                />
                <div>
                  <div className="font-mono text-sm text-secondary">Prompt completo</div>
                  <div className="font-mono text-xs text-muted-foreground">
                    Tomas control total del system prompt del mago.
                  </div>
                </div>
              </div>
            </label>
          </div>

          {(hiddenForm.mode === 'topics' || hiddenForm.mode === 'examples') && (
            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-[0.24em]">Topicos e instrucciones</Label>
              <Textarea
                value={hiddenForm.topicsText}
                onChange={(event) => {
                  setHiddenForm((current) => ({ ...current, topicsText: event.target.value }));
                  setHiddenDirty(true);
                }}
                rows={6}
                className="font-mono"
                placeholder="Un topico por linea. Ejemplo: menciona servidores fantasma, callejones, señales electricas..."
              />
            </div>
          )}

          {hiddenForm.mode === 'examples' && (
            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-[0.24em]">Frases de ejemplo</Label>
              <Textarea
                value={hiddenForm.examplePhrasesText}
                onChange={(event) => {
                  setHiddenForm((current) => ({ ...current, examplePhrasesText: event.target.value }));
                  setHiddenDirty(true);
                }}
                rows={5}
                className="font-mono"
                placeholder="Una frase por linea. El modelo las tomara como referencia tonal."
              />
            </div>
          )}

          {hiddenForm.mode === 'full_prompt' && (
            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-[0.24em]">System prompt completo</Label>
              <Textarea
                value={hiddenForm.systemPrompt}
                onChange={(event) => {
                  setHiddenForm((current) => ({ ...current, systemPrompt: event.target.value }));
                  setHiddenDirty(true);
                }}
                rows={9}
                className="font-mono"
                placeholder="Defini aqui la voz completa del Mago Digital."
              />
            </div>
          )}

          <Button
            type="button"
            onClick={handleHiddenSave}
            disabled={savingHidden}
            className="bg-accent text-accent-foreground font-mono"
          >
            {savingHidden ? 'Guardando...' : 'Guardar mago oculto'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminWizardPanel;
