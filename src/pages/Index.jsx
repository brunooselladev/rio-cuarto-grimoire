import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button.jsx';
import { Map, Sparkles, BookOpen, Eye } from 'lucide-react';
import heroImage from '@/assets/hero-riocuarto.jpg';

const Index = () => {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* CRT Scan Lines Effect */}
      <div className="fixed inset-0 scan-line pointer-events-none z-50" />

      {/* Hero Section */}
      <div className="relative min-h-screen flex items-center justify-center">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${heroImage})` }}>
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
          <div className="absolute inset-0 bg-gradient-to-r from-secondary/20 via-transparent to-primary/20" />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center animate-fade-in">
          {/* Glitch Title */}
          <div className="mb-6">
            <h1 className="text-6xl md:text-8xl font-bold mb-4 glow-text-green animate-flicker">RÍO CUARTO</h1>
            <h2 className="text-4xl md:text-6xl font-bold mb-2 glow-text-violet">1994</h2>
            <div className="text-xl md:text-2xl font-mono text-accent animate-pulse-glow">∴ MAGO: LA ASCENSIÓN ∴</div>
          </div>

          {/* Mystical Separator */}
          <div className="flex items-center justify-center gap-4 my-8">
            <div className="h-px w-20 bg-gradient-to-r from-transparent to-primary" />
            <Sparkles className="text-primary animate-pulse-glow" />
            <div className="h-px w-20 bg-gradient-to-l from-transparent to-primary" />
          </div>

          {/* Description */}
          <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto leading-relaxed font-mono text-muted-foreground">
            Un mapa narrativo donde la <span className="text-primary glow-text-green">tecnología</span> y la{' '}
            <span className="text-secondary glow-text-violet">magia</span> convergen en las calles olvidadas.
            <br />
            <span className="text-accent">La realidad es maleable. La paradoja acecha.</span>
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-12">
            <Link to="/map">
              <Button size="lg" className="bg-primary text-primary-foreground border-glow-green hover:bg-primary/90 font-mono text-lg px-8">
                <Map className="mr-2" />
                EXPLORAR MAPA
              </Button>
            </Link>
            <Link to="/control">
              <Button size="lg" variant="outline" className="border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground border-2 font-mono text-lg px-8">
                <Eye className="mr-2" />
                PANEL NARRADOR
              </Button>
            </Link>
          </div>

          {/* Bottom Info */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-sm font-mono">
            <div className="border border-primary/30 p-4 bg-card/50 backdrop-blur">
              <Map className="mx-auto mb-2 text-primary" size={24} />
              <div className="text-primary">MAPEO INTERACTIVO</div>
              <div className="text-muted-foreground">Puntos de poder y misión</div>
            </div>
            <div className="border border-accent/30 p-4 bg-card/50 backdrop-blur">
              <BookOpen className="mx-auto mb-2 text-accent" size={24} />
              <div className="text-accent">NARRATIVA VIVA</div>
              <div className="text-muted-foreground">Historia en tiempo real</div>
            </div>
            <div className="border border-secondary/30 p-4 bg-card/50 backdrop-blur">
              <Sparkles className="mx-auto mb-2 text-secondary" size={24} />
              <div className="text-secondary">ESFERAS MÍSTICAS</div>
              <div className="text-muted-foreground">Magia y tecnología</div>
            </div>
          </div>
        </div>
      </div>

      {/* Terminal-style Footer */}
      <div className="fixed bottom-4 left-4 font-mono text-xs text-primary/50 border border-primary/20 bg-background/80 p-2 backdrop-blur">
        <div>SISTEMA: ACTIVO</div>
        <div>CONEXIÓN: ESTABLECIDA</div>
        <div className="animate-pulse-glow">█</div>
      </div>
    </div>
  );
};

export default Index;
