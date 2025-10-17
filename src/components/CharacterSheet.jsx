import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Save, Download, Sparkles } from 'lucide-react';

import { generateCharacterSheetPdf } from '@/lib/pdfService.js';

// Helper component for dot-based ratings
const DotRating = ({ label, value, max = 5, onChange }) => (
  <div className="flex items-center justify-between">
    <Label className="font-mono text-sm capitalize">{label}</Label>
    <div className="flex items-center gap-1.5">
      {[...Array(max)].map((_, i) => (
        <div
          key={i}
          onClick={() => onChange(i + 1)}
          className={`h-3 w-3 rounded-full cursor-pointer transition-all border border-primary/50 ${i < value ? 'bg-primary' : 'bg-background'}`}>
        </div>
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
      const keys = path.split('.');
      const newSheet = { ...prevSheet };
      let current = newSheet;
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]] = { ...current[keys[i]] };
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
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle className="text-2xl text-primary glow-text-green">Hoja de Personaje</CardTitle>
          <CardDescription className="font-mono">Edita y gestiona los detalles de tu personaje.</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave}><Save className="mr-2" size={16} /> Guardar Cambios</Button>
                    <Button onClick={handleDownloadPdf} variant="outline" disabled={isDownloading}>
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
          <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.keys(sheet.spheres).map(sphere => (
              <DotRating key={sphere} label={sphere} value={sheet.spheres[sphere]} max={5} onChange={val => handleInputChange(`spheres.${sphere}`, val)} />
            ))}
          </CardContent>
        </Card>

      </CardContent>
    </Card>
  );
};

export default CharacterSheet;
