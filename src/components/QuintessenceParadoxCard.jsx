import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

/**
 * QuintessenceParadoxCard Component
 * 
 * Displays a circular ring with markers for Quintessence (top half) and Paradox (bottom half).
 * The dividing point is at 9 o'clock (left side) marked with a black dot.
 * 
 * Angle calculation:
 * - Top arc (Quintessence): 10 markers from 180° to 360° (left to right on top semicircle)
 * - Bottom arc (Paradox): 10 markers from 180° to 0° (left to right on bottom semicircle)
 * - Starting point (black dot) at 180° (9 o'clock position)
 */
const QuintessenceParadoxCard = ({ 
  quintessence = 0, 
  paradox = 0, 
  onChange, 
  className = '' 
}) => {
  // SVG configuration
  const centerX = 120;
  const centerY = 120;
  const radius = 80;
  const markerSize = 12;

  // Generate top markers (Quintessence: 10 markers from 180° to 360°)
  const topMarkers = Array.from({ length: 10 }, (_, i) => {
    const angle = 180 + (i * 180 / 9); // 9 intervals to reach exactly 360° with the 10th marker
    const rad = (angle * Math.PI) / 180;
    return {
      x: centerX + radius * Math.cos(rad),
      y: centerY + radius * Math.sin(rad),
      index: i,
      filled: i < quintessence
    };
  });

  // Generate bottom markers (Paradox: 10 markers from 180° to 0°, right to left)
  const bottomMarkers = Array.from({ length: 10 }, (_, i) => {
    const angle = 180 - (i * 180 / 9); // 9 intervals to reach exactly 0° with the 10th marker
    const rad = (angle * Math.PI) / 180;
    return {
      x: centerX + radius * Math.cos(rad),
      y: centerY + radius * Math.sin(rad),
      index: i,
      filled: i < paradox
    };
  });

  const handleMarkerClick = (type, index) => {
    const newValue = index + 1;
    if (type === 'quintessence') {
      onChange({ quintessence: newValue === quintessence ? index : newValue, paradox });
    } else {
      onChange({ quintessence, paradox: newValue === paradox ? index : newValue });
    }
  };

  const handleKeyDown = (e, type, index) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleMarkerClick(type, index);
    }
  };

  return (
    <Card className={`bg-card/80 backdrop-blur-sm border-primary/20 border-glow-green font-mono ${className}`}>
      <CardContent className="p-6">
        {/* Title and value for Quintessence */}
        <div className="text-center mb-2">
          <span className="text-accent text-sm font-bold">Quintaesencia</span>
          <span className="text-xs text-muted-foreground ml-2">{quintessence} / 10</span>
        </div>

        {/* SVG Ring */}
        <div className="flex justify-center">
          <svg 
            viewBox="0 0 240 240" 
            className="w-full max-w-[240px]"
            role="img"
            aria-label="Quintessence and Paradox tracker"
          >
            {/* Dividing point (black dot at 9 o'clock) */}
            <circle
              cx={centerX + radius * Math.cos(Math.PI)}
              cy={centerY + radius * Math.sin(Math.PI)}
              r="4"
              fill="black"
            />

            {/* Top markers (Quintessence) */}
            {topMarkers.map((marker) => (
              <g
                key={`quint-${marker.index}`}
                role="button"
                tabIndex={0}
                onClick={() => handleMarkerClick('quintessence', marker.index)}
                onKeyDown={(e) => handleKeyDown(e, 'quintessence', marker.index)}
                aria-label={`Quintessence marker ${marker.index + 1}`}
                className="cursor-pointer focus:outline-none"
              >
                <rect
                  x={marker.x - markerSize / 2}
                  y={marker.y - markerSize / 2}
                  width={markerSize}
                  height={markerSize}
                  rx="1"
                  className={`transition-all ${
                    marker.filled 
                      ? 'fill-primary stroke-primary/70' 
                      : 'fill-background stroke-primary/50'
                  } hover:stroke-primary stroke-[1.5]`}
                />
              </g>
            ))}

            {/* Bottom markers (Paradox) */}
            {bottomMarkers.map((marker) => (
              <g
                key={`paradox-${marker.index}`}
                role="button"
                tabIndex={0}
                onClick={() => handleMarkerClick('paradox', marker.index)}
                onKeyDown={(e) => handleKeyDown(e, 'paradox', marker.index)}
                aria-label={`Paradox marker ${marker.index + 1}`}
                className="cursor-pointer focus:outline-none"
              >
                <rect
                  x={marker.x - markerSize / 2}
                  y={marker.y - markerSize / 2}
                  width={markerSize}
                  height={markerSize}
                  rx="1"
                  className={`transition-all ${
                    marker.filled 
                      ? 'fill-primary stroke-primary/70' 
                      : 'fill-background stroke-primary/50'
                  } hover:stroke-primary stroke-[1.5]`}
                />
              </g>
            ))}
          </svg>
        </div>

        {/* Title and value for Paradox */}
        <div className="text-center mt-2">
          <span className="text-accent text-sm font-bold">Paradoja</span>
          <span className="text-xs text-muted-foreground ml-2">{paradox} / 10</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuintessenceParadoxCard;