import { useEffect, useRef, useState } from 'react';
import WizardSprite from '@/components/WizardSprite.jsx';
import { useWizard } from '@/contexts/WizardContext.jsx';

const CORNERS = [
  {
    name: 'bottom-right',
    wrapper: 'bottom-6 right-6',
    bubble: 'right-0 bottom-full mb-3',
  },
  {
    name: 'bottom-left',
    wrapper: 'bottom-6 left-6',
    bubble: 'left-0 bottom-full mb-3',
  },
  {
    name: 'top-right',
    wrapper: 'top-24 right-6',
    bubble: 'right-0 bottom-full mb-3',
  },
];

const HiddenWizard = ({ location }) => {
  const { wizardState, viewer, triggerSpeak } = useWizard();
  const wrapperRef = useRef(null);
  const [corner] = useState(() => CORNERS[Math.floor(Math.random() * CORNERS.length)]);
  const [open, setOpen] = useState(false);
  const [loadingSpeech, setLoadingSpeech] = useState(false);
  const [fullText, setFullText] = useState('');
  const [typedText, setTypedText] = useState('');
  const [typingComplete, setTypingComplete] = useState(false);
  const [hovered, setHovered] = useState(false);

  const shouldRender =
    Boolean(viewer) &&
    wizardState.hidden.active &&
    wizardState.hidden.location === location;

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
        setFullText('');
        setTypedText('');
        setTypingComplete(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !fullText) {
      setTypedText('');
      setTypingComplete(false);
      return undefined;
    }

    setTypedText('');
    setTypingComplete(false);

    let index = 0;
    const intervalId = window.setInterval(() => {
      index += 1;
      setTypedText(fullText.slice(0, index));

      if (index >= fullText.length) {
        window.clearInterval(intervalId);
        setTypingComplete(true);
      }
    }, 28);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [fullText, open]);

  useEffect(() => {
    if (shouldRender) {
      return;
    }

    setOpen(false);
    setLoadingSpeech(false);
    setFullText('');
    setTypedText('');
    setTypingComplete(false);
  }, [shouldRender]);

  const handleSummonWizard = async () => {
    if (loadingSpeech) {
      return;
    }

    setLoadingSpeech(true);
    setOpen(false);
    setFullText('');
    setTypedText('');
    setTypingComplete(false);

    try {
      const nextText = await triggerSpeak();
      setFullText(nextText || 'Las runas chisporrotean, pero hoy me guardo el veredicto.');
      setOpen(true);
    } catch (error) {
      console.error('Error triggering hidden wizard speech:', error);
      setFullText('Las runas chisporrotean, pero hoy me guardo el veredicto.');
      setOpen(true);
    } finally {
      setLoadingSpeech(false);
    }
  };

  if (!shouldRender) {
    return null;
  }

  return (
    <div ref={wrapperRef} className={`fixed z-[850] ${corner.wrapper}`}>
      {open && (
        <div
          className={`absolute ${corner.bubble} w-[220px] border p-3 font-mono text-xs leading-6 text-[#00ff9d]`}
          style={{
            borderColor: 'rgba(0, 255, 157, 0.9)',
            background:
              'linear-gradient(180deg, rgba(26, 10, 46, 0.92) 0%, rgba(8, 12, 16, 0.97) 100%)',
            boxShadow: '0 0 22px rgba(0, 255, 157, 0.18)',
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-35"
            style={{
              backgroundImage:
                'repeating-linear-gradient(to bottom, rgba(0, 212, 255, 0.12) 0px, rgba(0, 212, 255, 0.12) 1px, transparent 1px, transparent 4px)',
            }}
          />

          <div className="relative">
            <div className="mb-2 flex items-start justify-between gap-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#00d4ff]">
                El Mago habla
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="font-mono text-xs text-[#7b4fa0] transition-colors hover:text-[#00ff9d]"
                aria-label="Cerrar mensaje del mago"
              >
                X
              </button>
            </div>

            <div className="whitespace-pre-wrap">
              {typedText}
              {!typingComplete && <span className="ml-1 animate-pulse text-[#00d4ff]">_</span>}
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleSummonWizard}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="transition-all duration-200 hover:scale-105"
        style={{
          opacity: loadingSpeech || open || hovered ? 1 : 0.6,
          cursor: 'pointer',
          background: 'transparent',
          border: 'none',
          padding: 0,
        }}
        aria-label={`Invocar al mago oculto en ${location}`}
      >
        <WizardSprite size={48} talking={loadingSpeech || (open && !typingComplete)} />
      </button>
    </div>
  );
};

export default HiddenWizard;
