import { useEffect, useRef, useState } from 'react';

const SPRITE_SIZE = 24;
const COLORS = {
  black: '#080c10',
  neonGreen: '#00ff9d',
  neonCyan: '#00d4ff',
  violet: '#7b4fa0',
  deepViolet: '#1a0a2e',
};

const drawRects = (ctx, color, rects) => {
  ctx.fillStyle = color;
  rects.forEach(([x, y, width = 1, height = 1]) => {
    ctx.fillRect(x, y, width, height);
  });
};

const baseHood = [
  [9, 1, 6, 1],
  [8, 2, 8, 1],
  [7, 3, 10, 1],
  [6, 4, 12, 2],
  [5, 6, 14, 2],
  [4, 8, 16, 2],
  [3, 10, 18, 2],
  [4, 12, 16, 2],
  [5, 14, 14, 2],
  [6, 16, 12, 3],
  [7, 19, 10, 2],
  [8, 21, 8, 2],
];

const robeShadows = [
  [9, 6, 6, 2],
  [8, 8, 8, 3],
  [7, 11, 10, 2],
  [8, 13, 8, 2],
  [9, 15, 6, 2],
  [10, 17, 4, 4],
];

const shoulders = [
  [1, 12, 3, 3],
  [20, 12, 3, 3],
  [2, 15, 4, 4],
  [18, 15, 4, 4],
  [3, 19, 4, 3],
  [17, 19, 4, 3],
];

const cyanTrim = [
  [8, 3],
  [15, 3],
  [6, 6],
  [17, 6],
  [5, 9],
  [18, 9],
  [4, 12],
  [19, 12],
  [7, 20],
  [16, 20],
];

const hoodGlow = [
  [9, 4],
  [14, 4],
  [7, 7],
  [16, 7],
  [6, 10],
  [17, 10],
];

const faceVoid = [
  [9, 7, 6, 1],
  [8, 8, 8, 1],
  [8, 9, 8, 1],
  [8, 10, 8, 1],
  [9, 11, 6, 1],
  [10, 12, 4, 1],
];

const beardShadow = [
  [9, 12, 1, 2],
  [14, 12, 1, 2],
  [10, 13, 4, 2],
  [11, 15, 2, 1],
];

const runeGlow = [
  [11, 17],
  [13, 17],
  [10, 18],
  [14, 18],
  [12, 16],
];

const runeCore = [
  [12, 17],
  [11, 18, 3, 1],
  [12, 19],
  [12, 20],
];

const boots = [
  [8, 22, 2, 1],
  [14, 22, 2, 1],
];

const eyeGlow = [
  [8, 9],
  [15, 9],
  [9, 8],
  [14, 8],
];

const eyes = [
  [9, 9, 2, 1],
  [13, 9, 2, 1],
];

const mouthClosed = [[11, 12, 2, 1]];
const mouthOpen = [
  [10, 11, 4, 1],
  [10, 12, 4, 1],
  [11, 13, 2, 1],
];

const WizardSprite = ({ size = 96, talking = false }) => {
  const canvasRef = useRef(null);
  const [mouthFrame, setMouthFrame] = useState(0);

  useEffect(() => {
    if (!talking) {
      setMouthFrame(0);
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setMouthFrame((current) => (current === 0 ? 1 : 0));
    }, 130);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [talking]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    context.clearRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
    context.imageSmoothingEnabled = false;

    drawRects(context, COLORS.deepViolet, baseHood);
    drawRects(context, COLORS.black, shoulders);
    drawRects(context, COLORS.black, robeShadows);
    drawRects(context, COLORS.black, faceVoid);
    drawRects(context, COLORS.black, beardShadow);
    drawRects(context, COLORS.neonCyan, hoodGlow);
    drawRects(context, COLORS.neonCyan, cyanTrim);
    drawRects(context, COLORS.neonGreen, eyeGlow);
    drawRects(context, COLORS.neonGreen, eyes);
    drawRects(context, COLORS.violet, runeGlow);
    drawRects(context, COLORS.violet, runeCore);
    drawRects(context, COLORS.black, boots);
    drawRects(context, mouthFrame === 1 ? COLORS.neonGreen : COLORS.neonCyan, mouthFrame === 1 ? mouthOpen : mouthClosed);
  }, [mouthFrame]);

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
        filter: 'drop-shadow(0 0 14px rgba(0, 255, 157, 0.28)) drop-shadow(0 0 24px rgba(0, 212, 255, 0.18))',
      }}
    />
  );
};

export default WizardSprite;
