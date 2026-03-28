import { useEffect, useState } from 'react';
import { useWizard } from '@/contexts/WizardContext.jsx';
import WizardSprite from '@/components/WizardSprite.jsx';

const OVERLAY_SCANLINES = {
  backgroundImage:
    'repeating-linear-gradient(to bottom, rgba(0, 255, 157, 0.08) 0px, rgba(0, 255, 157, 0.08) 1px, transparent 1px, transparent 4px)',
};

const frameCornerStyle = {
  position: 'absolute',
  color: '#00ff9d',
  fontSize: '1.1rem',
  lineHeight: 1,
  textShadow: '0 0 10px rgba(0, 255, 157, 0.45)',
};

const WizardOverlay = () => {
  const { wizardState, viewer, dismissUrgent } = useWizard();
  const [typedText, setTypedText] = useState('');
  const [typingComplete, setTypingComplete] = useState(false);
  const [closing, setClosing] = useState(false);
  const [dismissError, setDismissError] = useState('');

  const messageText = wizardState.urgentMessage.text || '';
  const shouldShow =
    viewer?.role === 'player' &&
    wizardState.urgentMessage.active &&
    Boolean(messageText) &&
    !wizardState.computed.urgentMessage.dismissed;

  useEffect(() => {
    if (!shouldShow) {
      setTypedText('');
      setTypingComplete(false);
      setClosing(false);
      setDismissError('');
      return undefined;
    }

    setTypedText('');
    setTypingComplete(false);
    setDismissError('');

    let index = 0;
    const intervalId = window.setInterval(() => {
      index += 1;
      setTypedText(messageText.slice(0, index));

      if (index >= messageText.length) {
        window.clearInterval(intervalId);
        setTypingComplete(true);
      }
    }, 38);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [messageText, shouldShow]);

  const handleDismiss = async () => {
    if (!typingComplete || closing) {
      return;
    }

    try {
      setClosing(true);
      setDismissError('');
      await dismissUrgent();
    } catch (error) {
      console.error('Error dismissing urgent wizard message:', error);
      setClosing(false);
      setDismissError('No pude sellar la lectura. Reintenta en unos segundos.');
    }
  };

  if (!shouldShow) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{
        background:
          'radial-gradient(circle at top, rgba(0, 212, 255, 0.08), transparent 35%), rgba(0, 0, 0, 0.97)',
      }}
    >
      <div className="absolute inset-0 pointer-events-none" style={OVERLAY_SCANLINES} />

      <div
        className="relative w-full max-w-3xl border px-6 py-8 md:px-10 md:py-10"
        style={{
          borderColor: 'rgba(0, 255, 157, 0.85)',
          background: 'rgba(8, 12, 16, 0.94)',
          boxShadow: '0 0 0 1px rgba(123, 79, 160, 0.45), 0 0 28px rgba(0, 255, 157, 0.22)',
        }}
      >
        <span style={{ ...frameCornerStyle, top: '-0.75rem', left: '-0.45rem' }}>┌</span>
        <span style={{ ...frameCornerStyle, top: '-0.75rem', right: '-0.45rem' }}>┐</span>
        <span style={{ ...frameCornerStyle, bottom: '-0.85rem', left: '-0.45rem' }}>└</span>
        <span style={{ ...frameCornerStyle, bottom: '-0.85rem', right: '-0.45rem' }}>┘</span>

        <div className="flex flex-col items-center gap-6 md:flex-row md:items-start md:gap-10">
          <div className="shrink-0">
            <WizardSprite size={192} talking={!typingComplete} />
          </div>

          <div className="w-full">
            <div className="mb-3 font-mono text-xs uppercase tracking-[0.32em] text-[#00d4ff]">
              El Mago Digital transmite un mensaje urgente
            </div>

            <div
              className="min-h-[220px] border p-4 font-mono text-sm leading-7 text-[#00ff9d] md:text-base"
              style={{
                borderColor: 'rgba(123, 79, 160, 0.75)',
                background:
                  'linear-gradient(180deg, rgba(26, 10, 46, 0.42) 0%, rgba(8, 12, 16, 0.92) 100%)',
                boxShadow: 'inset 0 0 0 1px rgba(0, 255, 157, 0.12)',
                whiteSpace: 'pre-wrap',
              }}
            >
              {typedText}
              {!typingComplete && <span className="ml-1 inline-block animate-pulse text-[#00d4ff]">_</span>}
            </div>

            <div className="mt-5 flex items-center justify-between gap-4">
              <div>
                <div className="font-mono text-xs uppercase tracking-[0.18em] text-[#7b4fa0]">
                  {typingComplete ? 'Canal completado' : 'Descifrando transmision'}
                </div>
                {dismissError && (
                  <div className="mt-2 font-mono text-[11px] text-[#00d4ff]">{dismissError}</div>
                )}
              </div>

              {typingComplete && (
                <button
                  type="button"
                  onClick={handleDismiss}
                  disabled={closing}
                  className="border px-4 py-2 font-mono text-sm uppercase tracking-[0.24em] transition-colors"
                  style={{
                    borderColor: '#00ff9d',
                    color: '#00ff9d',
                    background: closing ? 'rgba(0, 255, 157, 0.08)' : 'rgba(0, 0, 0, 0.55)',
                  }}
                >
                  ■ {closing ? 'Sellando...' : 'Entendido'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WizardOverlay;
