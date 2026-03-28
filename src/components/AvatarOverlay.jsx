import { useEffect, useState } from 'react';
import AvatarSprite from '@/components/AvatarSprite.jsx';
import { useWizard } from '@/contexts/WizardContext.jsx';

const TypingText = ({ text, onDone }) => {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed('');
    setDone(false);
    if (!text) return;
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        window.clearInterval(id);
        setDone(true);
        onDone?.();
      }
    }, 30);
    return () => window.clearInterval(id);
  }, [text]);

  return (
    <span>
      {displayed}
      {!done && <span className="animate-pulse">_</span>}
    </span>
  );
};

const AvatarOverlay = () => {
  const { avatarState, dismissAvatar, viewer } = useWizard();
  const [textDone, setTextDone] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  const avatar = avatarState;
  const colorPrimary = avatar?.colorPrimary || '#a78bfa';
  const colorSecondary = avatar?.colorSecondary || '#7c3aed';
  const avatarName = avatar?.name || 'Avatar';

  // Show when active and not dismissed by this player
  const shouldShow =
    Boolean(viewer) &&
    Boolean(avatar) &&
    avatar.active?.isActive &&
    !avatar.active?.dismissed;

  // Reset typing animation when a new invocation occurs
  useEffect(() => {
    if (shouldShow) setTextDone(false);
  }, [avatar?.active?.message]);

  const handleDismiss = async () => {
    if (dismissing) return;
    setDismissing(true);
    try {
      await dismissAvatar(viewer.id);
    } finally {
      setDismissing(false);
    }
  };

  if (!shouldShow) return null;

  return (
    <div
      className="fixed inset-0 z-[950] flex flex-col items-center justify-center p-6"
      style={{
        background: `radial-gradient(ellipse at center, ${colorSecondary}33 0%, rgba(0,0,0,0.92) 70%)`,
        backdropFilter: 'blur(6px)',
      }}
    >
      {/* Sprite */}
      <div
        className="mb-8"
        style={{
          filter: `drop-shadow(0 0 40px ${colorPrimary}88) drop-shadow(0 0 80px ${colorSecondary}44)`,
          animation: 'float 3s ease-in-out infinite',
        }}
      >
        <AvatarSprite size={128} talking={!textDone} colorPrimary={colorPrimary} colorSecondary={colorSecondary} />
      </div>

      {/* Name */}
      <p
        className="font-mono text-[11px] uppercase tracking-[0.4em] mb-4 opacity-70"
        style={{ color: colorPrimary }}
      >
        {avatarName}
      </p>

      {/* Message */}
      {avatar.active?.message && (
        <div
          className="font-mono text-base leading-8 text-center max-w-md mb-10 px-6 py-4 rounded"
          style={{
            color: 'rgba(255,255,255,0.9)',
            background: `${colorSecondary}22`,
            border: `1px solid ${colorPrimary}44`,
            boxShadow: `0 0 24px ${colorPrimary}22`,
            minHeight: 72,
          }}
        >
          <TypingText text={avatar.active.message} onDone={() => setTextDone(true)} />
        </div>
      )}

      {/* Dismiss button — only visible after typing done */}
      <button
        type="button"
        onClick={handleDismiss}
        disabled={dismissing || !textDone}
        className="font-mono text-sm uppercase tracking-[0.2em] px-8 py-3 rounded transition-all"
        style={{
          opacity: textDone ? 1 : 0,
          pointerEvents: textDone ? 'auto' : 'none',
          background: `${colorPrimary}22`,
          border: `1px solid ${colorPrimary}66`,
          color: colorPrimary,
          boxShadow: textDone ? `0 0 16px ${colorPrimary}33` : 'none',
          transition: 'opacity 0.8s ease',
        }}
      >
        {dismissing ? 'Reconociendo...' : 'Reconozco mi Avatar'}
      </button>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
      `}</style>
    </div>
  );
};

export default AvatarOverlay;
