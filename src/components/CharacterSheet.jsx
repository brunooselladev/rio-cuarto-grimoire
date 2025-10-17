import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Save, Download, Sparkles } from 'lucide-react';
import QuintessenceParadoxCard from './QuintessenceParadoxCard.jsx';


import { generateCharacterSheetPdf } from '@/lib/pdfService.js';

// Helper component for dot-based ratings
const DotRating = ({ label, value, max = 5, onChange }) => (
  <div className="flex items-center justify-between w-full">
    {label && <Label className="font-mono text-sm capitalize">{label}</Label>}
    <div className="flex items-center gap-1.5 ml-auto">
      {[...Array(max)].map((_, i) => (
        <div
          key={i}
          onClick={() => onChange(i + 1)}
          className={`h-3 w-3 rounded-full cursor-pointer transition-all border border-primary/50 ${
            i < value ? 'bg-primary' : 'bg-background'
          }`}
        ></div>
      ))}
    </div>
  </div>
);


const CharacterSheet = ({ user }) => {
  const [sheet, setSheet] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const token = localStorage.getItem('authToken');

  const fetchSheet = useCallback(async () => {
    try {
      const response = await fetch('/api/character/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch character sheet');
      const data = await response.json();
      // Ensure advantages object and its arrays exist
      if (!data.advantages) {
        data.advantages = {};
      }
      if (!data.advantages.backgrounds) {
        data.advantages.backgrounds = [];
      }
      if (!data.advantages.merits) {
        data.advantages.merits = [];
      }
      if (!data.advantages.flaws) {
        data.advantages.flaws = [];
      }
      setSheet(data);
    } catch (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  useEffect(() => {
    fetchSheet();
  }, [fetchSheet]);

  const handleInputChange = (path, value) => {
    setSheet(prevSheet => {
      const newSheet = JSON.parse(JSON.stringify(prevSheet));
      const keys = path.split('.');
      let current = newSheet;
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return newSheet;
    });
  };

  const handleSave = async () => {
    try {
      const response = await fetch('/api/character', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(sheet),
      });
      if (!response.ok) throw new Error('Failed to save character sheet');
      toast({ title: 'Guardado', description: 'Tu hoja de personaje ha sido guardada.' });
    } catch (error) {
      toast({ title: 'Error al Guardar', description: error.message, variant: 'destructive' });
    }
  };

  const [isDownloading, setIsDownloading] = useState(false);

  const addBackground = () => {
    const newBackgrounds = [...(sheet.advantages.backgrounds || []), { name: '', value: 0 }];
    handleInputChange('advantages.backgrounds', newBackgrounds);
  };

  const addMerit = () => {
    const newMerits = [...(sheet.advantages.merits || []), { name: '', value: 0 }];
    handleInputChange('advantages.merits', newMerits);
  };

  const addFlaw = () => {
    const newFlaws = [...(sheet.advantages.flaws || []), { name: '', value: 0 }];
    handleInputChange('advantages.flaws', newFlaws);
  };

  const handleDownloadPdf = async () => {
    if (!sheet) {
      toast({ title: 'Error', description: 'No hay datos de la hoja para descargar.', variant: 'destructive' });
      return;
    }
    setIsDownloading(true);
    try {
      await generateCharacterSheetPdf(sheet);
      toast({ title: 'Descarga Iniciada', description: 'Tu PDF se está generando.' });
    } catch (error) {
      console.error("PDF Generation Error: ", error);
      toast({ title: 'Error de PDF', description: 'No se pudo generar el PDF.', variant: 'destructive' });
    }
    setIsDownloading(false);
  };

  if (loading) {
    return <div className="font-mono text-center p-10">Cargando Hoja de Personaje...</div>;
  }

  if (!sheet) {
    return <div className="font-mono text-center p-10 text-destructive">No se pudo cargar la hoja de personaje.</div>;
  }

  return (
    <Card className="bg-card/80 backdrop-blur-sm border-primary/20 border-glow-green font-mono">
      <CardHeader className="flex-col sm:flex-row items-start sm:items-center justify-between">
        <div>
          <CardTitle className="text-2xl text-primary glow-text-green">Hoja de Personaje</CardTitle>
          <CardDescription className="font-mono">Edita y gestiona los detalles de tu personaje.</CardDescription>
        </div>
        <div className="flex  md:flex-row flex-col w-full md:w-auto gap-2 mt-4 sm:mt-0">
          <Button onClick={handleSave}><Save className="mr-2" size={16} /> Guardar Cambios</Button>
                    <Button onClick={handleDownloadPdf} variant="outline" disabled>
            {isDownloading ? 'Generando...' : <><Download className="mr-2" size={16} /> Descargar PDF</>}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input value={sheet.name} onChange={e => handleInputChange('name', e.target.value)} placeholder="Nombre del Personaje" />
          </div>
          <div className="space-y-2">
            <Label>Jugador</Label>
            <Input value={sheet.player} onChange={e => handleInputChange('player', e.target.value)} placeholder="Tu Nombre" />
          </div>
          <div className="space-y-2">
            <Label>Crónica</Label>
            <Input value={sheet.chronicle} onChange={e => handleInputChange('chronicle', e.target.value)} placeholder="Nombre de la Crónica" />
          </div>
          <div className="space-y-2">
            <Label>Naturaleza</Label>
            <Input value={sheet.nature} onChange={e => handleInputChange('nature', e.target.value)} placeholder="Arquetipo de personalidad" />
          </div>
          <div className="space-y-2">
            <Label>Conducta</Label>
            <Input value={sheet.demeanor} onChange={e => handleInputChange('demeanor', e.target.value)} placeholder="Máscara que muestras al mundo" />
          </div>
          <div className="space-y-2">
            <Label>Concepto</Label>
            <Input value={sheet.concept} onChange={e => handleInputChange('concept', e.target.value)} placeholder="Concepto del personaje" />
          </div>
        </div>

        {/* Attributes */}
        <Card className="border-accent/30">
          <CardHeader><CardTitle className="text-accent">Atributos</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <h4 className="font-bold text-lg">Físicos</h4>
              {Object.keys(sheet.attributes.physical).map(attr => (
                <DotRating key={attr} label={attr} value={sheet.attributes.physical[attr]} onChange={val => handleInputChange(`attributes.physical.${attr}`, val)} />
              ))}
            </div>
            <div className="space-y-3">
              <h4 className="font-bold text-lg">Sociales</h4>
              {Object.keys(sheet.attributes.social).map(attr => (
                <DotRating key={attr} label={attr} value={sheet.attributes.social[attr]} onChange={val => handleInputChange(`attributes.social.${attr}`, val)} />
              ))}
            </div>
            <div className="space-y-3">
              <h4 className="font-bold text-lg">Mentales</h4>
              {Object.keys(sheet.attributes.mental).map(attr => (
                <DotRating key={attr} label={attr} value={sheet.attributes.mental[attr]} onChange={val => handleInputChange(`attributes.mental.${attr}`, val)} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Abilities */}
        <Card className="border-accent/30">
          <CardHeader><CardTitle className="text-accent">Habilidades</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <h4 className="font-bold text-lg">Talentos</h4>
              {Object.keys(sheet.abilities.talents).map(ability => (
                <DotRating key={ability} label={ability} value={sheet.abilities.talents[ability]} onChange={val => handleInputChange(`abilities.talents.${ability}`, val)} />
              ))}
            </div>
            <div className="space-y-3">
              <h4 className="font-bold text-lg">Técnicas</h4>
              {Object.keys(sheet.abilities.skills).map(ability => (
                <DotRating key={ability} label={ability} value={sheet.abilities.skills[ability]} onChange={val => handleInputChange(`abilities.skills.${ability}`, val)} />
              ))}
            </div>
            <div className="space-y-3">
              <h4 className="font-bold text-lg">Conocimientos</h4>
              {Object.keys(sheet.abilities.knowledges).map(ability => (
                <DotRating key={ability} label={ability} value={sheet.abilities.knowledges[ability]} onChange={val => handleInputChange(`abilities.knowledges.${ability}`, val)} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Spheres */}
        <Card className="border-accent/30">
          <CardHeader><CardTitle className="text-accent flex items-center"><Sparkles className="mr-2" size={20}/>Esferas</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {Object.keys(sheet.spheres).map(sphere => (
              <DotRating key={sphere} label={sphere} value={sheet.spheres[sphere]} max={5} onChange={val => handleInputChange(`spheres.${sphere}`, val)} />
            ))}
          </CardContent>
        </Card>

        {/* Advantages, Willpower & Health */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-accent/30 md:col-span-3 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-accent">Ventajas</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Grid general: 2 columnas en desktop, 1 en mobile */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* --- Columna Izquierda: Trasfondos --- */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-lg">Trasfondos</h4>
                    <Button size="sm" onClick={addBackground}>Añadir</Button>
                  </div>

                  {sheet.advantages?.backgrounds?.map((bg, index) => (
                    <div key={index} className="grid grid-cols-2 items-center gap-2">
                      <Input
                        value={bg.name}
                        onChange={e => handleInputChange(`advantages.backgrounds.${index}.name`, e.target.value)}
                        placeholder="Nombre del Trasfondo"
                        className="font-mono"
                      />
                      <DotRating
                        label=""
                        value={bg.value}
                        onChange={val => handleInputChange(`advantages.backgrounds.${index}.value`, val)}
                      />
                    </div>
                  ))}
                </div>

                {/* --- Columna Derecha: Otros Rasgos --- */}
                <div className="space-y-3">
                  <h4 className="font-bold text-lg">Otros Rasgos</h4>

                  {/* Flex con wrap: evita que los ratings se desborden */}
                  <div className="flex flex-wrap gap-3 ">
                    <DotRating
                      label="Arete"
                      value={sheet.advantages?.arete}
                      max={10}
                      onChange={val => handleInputChange('advantages.arete', val)}
                    />
                    
                    {/* Fuerza de Voluntad con puntos temporales */}
                    <div className="space-y-2 w-full">
                      <DotRating
                        label="Fuerza de Voluntad"
                        value={sheet.advantages?.willpower}
                        max={10}
                        onChange={val => handleInputChange('advantages.willpower', val)}
                      />
                      <div className="flex items-center justify-end gap-1.5">
                        {[...Array(10)].map((_, i) => (
                          <div
                            key={i}
                            onClick={() => handleInputChange('advantages.willpower_current', i + 1)}
                            className={`h-3 w-3 cursor-pointer transition-all border border-primary/50 ${i < (sheet.advantages?.willpower_current || sheet.advantages?.willpower || 0) ? 'bg-primary' : 'bg-background'}`}>
                          </div>
                        ))}
                      </div>
                    </div>
                  
                    <QuintessenceParadoxCard
                      quintessence={sheet.advantages?.quintessence || 0}
                      paradox={sheet.advantages?.paradox || 0}
                      onChange={({ quintessence, paradox }) => {
                        handleInputChange('advantages.quintessence', quintessence);
                        handleInputChange('advantages.paradox', paradox);
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* --- Méritos y Defectos --- */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-lg">Méritos</h4>
                    <Button size="sm" onClick={addMerit}>Añadir</Button>
                  </div>
                  {sheet.advantages?.merits?.map((merit, index) => (
                    <div key={index} className="grid grid-cols-2 items-center gap-2">
                      <Input
                        value={merit.name}
                        onChange={e => handleInputChange(`advantages.merits.${index}.name`, e.target.value)}
                        placeholder="Nombre del Mérito"
                        className="font-mono"
                      />
                      <DotRating
                        label=""
                        value={merit.value}
                        onChange={val => handleInputChange(`advantages.merits.${index}.value`, val)}
                      />
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-lg">Defectos</h4>
                    <Button size="sm" onClick={addFlaw}>Añadir</Button>
                  </div>
                  {sheet.advantages?.flaws?.map((flaw, index) => (
                    <div key={index} className="grid grid-cols-2 items-center gap-2">
                      <Input
                        value={flaw.name}
                        onChange={e => handleInputChange(`advantages.flaws.${index}.name`, e.target.value)}
                        placeholder="Nombre del Defecto"
                        className="font-mono"
                      />
                      <DotRating
                        label=""
                        value={flaw.value}
                        onChange={val => handleInputChange(`advantages.flaws.${index}.value`, val)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* --- Otros Rasgos --- */}
              <div>
                <h4 className="font-bold text-lg mt-4 mb-2">Otros Rasgos</h4>
                <Textarea
                  value={sheet.otherTraits || ''}
                  onChange={e => handleInputChange('otherTraits', e.target.value)}
                  placeholder="Anota aquí otros rasgos, equipo, etc."
                  className="font-mono"
                />
              </div>
            </CardContent>
          </Card>


          <div className="space-y-6">
            <Card className="border-accent/30">
              <CardHeader><CardTitle className="text-accent">Salud</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {sheet.health && Object.keys(sheet.health).map(level => (
                  <div key={level} className="flex items-center justify-between gap-2">
                    <Label className="capitalize font-mono text-xs">{level.replace('_', ' ')}</Label>
                    <Checkbox checked={sheet.health[level]} onCheckedChange={val => handleInputChange(`health.${level}`, val)} />
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="border-accent/30">
              <CardHeader><CardTitle className="text-accent">Experiencia</CardTitle></CardHeader>
              <CardContent>
                <Input type="number" value={sheet.experience} onChange={e => handleInputChange('experience', e.target.value)} placeholder="Puntos de experiencia" className="font-mono" />
              </CardContent>
            </Card>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CharacterSheet;
