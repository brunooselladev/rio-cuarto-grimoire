import { useEffect, useRef, useState } from 'react';

const SPRITE_SIZE = 24;

const drawRects = (ctx, color, rects) => {
  ctx.fillStyle = color;
  rects.forEach(([x, y, width = 1, height = 1]) => {
    ctx.fillRect(x, y, width, height);
  });
};

// Ethereal orb / spiritual form — distinct from the hooded wizard
const coreBody = [
  [9,  5, 6, 1],
  [7,  6, 10, 1],
  [6,  7, 12, 2],
  [5,  9, 14, 2],
  [5, 11, 14, 2],
  [6, 13, 12, 2],
  [7, 15, 10, 2],
  [8, 17, 8, 1],
  [9, 18, 6, 1],
  [10,19, 4, 1],
];

const innerGlow = [
  [10,  7, 4, 1],
  [9,   8, 6, 2],
  [8,  10, 8, 2],
  [9,  12, 6, 2],
  [10, 14, 4, 1],
];

const coreHeart = [
  [11,  9, 2, 1],
  [10, 10, 4, 2],
  [11, 12, 2, 1],
];

const tendrils = [
  [4,  8, 1, 1],
  [3,  9, 1, 2],
  [4, 11, 1, 1],
  [19, 8, 1, 1],
  [20, 9, 1, 2],
  [19,11, 1, 1],
  [7,  4, 1, 1],
  [12, 3, 1, 1],
  [16, 4, 1, 1],
  [8, 20, 1, 1],
  [12,21, 1, 1],
  [15,20, 1, 1],
];

const eyeLeft  = [[9, 10, 2, 2]];
const eyeRight = [[13,10, 2, 2]];
const eyeGlowLeft  = [[8, 9], [8, 11], [10, 9]];
const eyeGlowRight = [[15,9], [15,11],[13, 9]];

const mouthClosed = [[10,14, 4, 1]];
const mouthOpen   = [[10,14, 4, 1],[11,15, 2, 1]];

// Parse hex color to rgba string
function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0,2),16);
  const g = parseInt(h.substring(2,4),16);
  const b = parseInt(h.substring(4,6),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const AvatarSprite = ({ size = 96, talking = false, colorPrimary = '#a78bfa', colorSecondary = '#7c3aed' }) => {
  const canvasRef = useRef(null);
  const [mouthFrame, setMouthFrame] = useState(0);
  const [pulseFrame, setPulseFrame] = useState(0);

  useEffect(() => {
    if (!talking) { setMouthFrame(0); return undefined; }
    const id = window.setInterval(() => setMouthFrame((v) => (v === 0 ? 1 : 0)), 140);
    return () => window.clearInterval(id);
  }, [talking]);

  useEffect(() => {
    const id = window.setInterval(() => setPulseFrame((v) => (v + 1) % 8), 120);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Pulse: alternate between primary and slightly lighter
    const isLight = pulseFrame < 4;
    const bodyColor = isLight ? colorPrimary : colorSecondary;
    const glowColor = isLight ? colorSecondary : colorPrimary;

    ctx.clearRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
    ctx.imageSmoothingEnabled = false;

    drawRects(ctx, hexToRgba(colorSecondary, 0.5), coreBody);
    drawRects(ctx, hexToRgba(bodyColor, 0.85), innerGlow);
    drawRects(ctx, '#ffffff', coreHeart);
    drawRects(ctx, hexToRgba(glowColor, 0.6), tendrils);
    drawRects(ctx, glowColor, eyeGlowLeft);
    drawRects(ctx, glowColor, eyeGlowRight);
    drawRects(ctx, '#ffffff', eyeLeft);
    drawRects(ctx, '#ffffff', eyeRight);
    drawRects(ctx, glowColor, mouthFrame === 1 ? mouthOpen : mouthClosed);
  }, [mouthFrame, pulseFrame, colorPrimary, colorSecondary]);

  return (
    <canvas
      ref={canvasRef}
      width={SPRITE_SIZE}
      height={SPRITE_SIZE}
      aria-hidden="true"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        imageRendering: 'pixelated',
        display: 'block',
        filter: `drop-shadow(0 0 12px ${hexToRgba(colorPrimary, 0.6)}) drop-shadow(0 0 24px ${hexToRgba(colorSecondary, 0.4)})`,
      }}
    />
  );
};

export default AvatarSprite;
