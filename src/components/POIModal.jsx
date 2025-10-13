import { X, Eye, Sparkles, Map } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';

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

const POIModal = ({ poi, onClose }) => {
  const typeColorClass = getTypeColor(poi.type);

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-card border-2 border-primary max-w-2xl w-full max-h-[80vh] overflow-y-auto animate-fade-in border-glow-green">
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

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-mono border-glow-green">
              <Eye className="mr-2" size={16} />
              REVELAR PISTAS
            </Button>
            <Button variant="outline" className="flex-1 border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground font-mono">
              <Sparkles className="mr-2" size={16} />
              MARCAR EVENTO
            </Button>
          </div>
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
  );
};

export default POIModal;
