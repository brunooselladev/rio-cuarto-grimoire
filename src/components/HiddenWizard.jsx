import { useEffect, useRef, useState, useCallback } from 'react';
import WizardSprite from '@/components/WizardSprite.jsx';
import { useWizard } from '@/contexts/WizardContext.jsx';

const CORNER = { wrapper: 'bottom-6 right-6' };

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
    }, 22);
    return () => window.clearInterval(id);
  }, [text]);

  return (
    <span>
      {displayed}
      {!done && <span className="ml-0.5 animate-pulse text-[#00d4ff]">_</span>}
    </span>
  );
};

const HiddenWizard = ({ location }) => {
  const { wizardState, viewer, triggerSpeak } = useWizard();

  // modal = blocking center overlay; corner = small floating sprite
  const [mode, setMode] = useState('modal'); // 'modal' | 'corner'
  const [chatOpen, setChatOpen] = useState(false);
  const [history, setHistory] = useState([]); // [{role:'user'|'wizard', text}]
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  const shouldRender =
    Boolean(viewer) &&
    wizardState.hidden.active &&
    wizardState.hidden.location === location;

  // On first activation: open modal, send greeting
  useEffect(() => {
    if (!shouldRender) {
      setInitialized(false);
      setMode('modal');
      setChatOpen(false);
      setHistory([]);
      return;
    }
    if (initialized) return;
    setInitialized(true);
    setMode('modal');
    setChatOpen(true);
    sendMessage('');
  }, [shouldRender]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const sendMessage = useCallback(async (text) => {
    const trimmed = text.trim();

    // Build the new history including the user's message (if any)
    const newHistory = trimmed
      ? [...history, { role: 'user', text: trimmed }]
      : [...history];

    if (trimmed) setHistory(newHistory);
    setInputText('');
    setLoading(true);

    try {
      // Convert full chat history (excluding the last user msg) to Anthropic format
      const apiHistory = newHistory.slice(0, trimmed ? -1 : undefined).map((m) => ({
        role: m.role === 'wizard' ? 'assistant' : 'user',
        content: m.text,
      }));

      const reply = await triggerSpeak({
        message: trimmed || undefined,
        history: apiHistory,
      });
      setHistory([...newHistory, { role: 'wizard', text: reply }]);
    } catch {
      setHistory([...newHistory, { role: 'wizard', text: 'Las runas chisporrotean, pero hoy me guardo el veredicto.' }]);
    } finally {
      setLoading(false);
    }
  }, [history, triggerSpeak]);

  const handleSend = () => {
    if (!inputText.trim() || loading) return;
    sendMessage(inputText);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDismissModal = () => {
    setMode('corner');
    setChatOpen(false);
  };

  const handleCornerClick = () => {
    if (loading) return;
    setChatOpen((v) => !v);
  };

  // Voice input — toggle: un click para empezar, otro para parar (o para automático por silencio)
  const toggleListening = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const r = new SpeechRecognition();
    r.lang = 'es-AR';
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = (e) => {
      const transcript = e.results[0][0].transcript.trim();
      recognitionRef.current = null;
      setListening(false);
      if (transcript) {
        // Enviar directo al mago sin pasar por el input
        sendMessage(transcript);
      }
    };
    r.onerror = () => { setListening(false); recognitionRef.current = null; };
    r.onend = () => { setListening(false); recognitionRef.current = null; };
    recognitionRef.current = r;
    r.start();
    setListening(true);
  };

  const hasSpeechAPI = typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  if (!shouldRender) return null;

  const chatPanel = (
    <div
      className="flex flex-col"
      style={{
        width: mode === 'modal' ? '100%' : 280,
        maxWidth: mode === 'modal' ? 520 : 280,
        maxHeight: mode === 'modal' ? '60vh' : 360,
        background: 'linear-gradient(180deg, rgba(8,4,20,0.97) 0%, rgba(4,8,14,0.99) 100%)',
        border: '1px solid rgba(0,255,157,0.5)',
        boxShadow: '0 0 32px rgba(0,255,157,0.15)',
        borderRadius: 8,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: 'rgba(0,255,157,0.2)' }}>
        <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-[#00d4ff]">El Mago Oculto</span>
        <button
          type="button"
          onClick={mode === 'modal' ? handleDismissModal : () => setChatOpen(false)}
          className="font-mono text-xs text-[#7b4fa0] hover:text-[#00ff9d] transition-colors"
        >
          {mode === 'modal' ? 'CERRAR Y CONTINUAR →' : '✕'}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ minHeight: 120 }}>
        {history.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className="font-mono text-xs leading-5 px-3 py-2 rounded max-w-[85%]"
              style={msg.role === 'wizard'
                ? { background: 'rgba(0,255,157,0.07)', color: '#00ff9d', border: '1px solid rgba(0,255,157,0.2)' }
                : { background: 'rgba(123,79,160,0.2)', color: '#e4b9ff', border: '1px solid rgba(123,79,160,0.3)' }
              }
            >
              {i === history.length - 1 && msg.role === 'wizard' && !loading
                ? <TypingText text={msg.text} />
                : msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="font-mono text-xs px-3 py-2 rounded" style={{ color: '#00d4ff', background: 'rgba(0,212,255,0.07)', border: '1px solid rgba(0,212,255,0.2)' }}>
              <span className="animate-pulse">consultando las runas...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-2 border-t flex gap-2 items-center" style={{ borderColor: 'rgba(0,255,157,0.15)' }}>
        <input
          ref={inputRef}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Preguntale al mago..."
          disabled={loading}
          className="flex-1 bg-transparent font-mono text-xs text-[#00ff9d] placeholder-[#336655] outline-none border-b border-[#00ff9d]/30 pb-1"
        />
        {/* Voice button */}
        {hasSpeechAPI && (
          <button
            type="button"
            onClick={toggleListening}
            disabled={loading}
            title={listening ? 'Hablando... (click para cancelar)' : 'Hablar'}
            className="font-mono text-sm transition-all"
            style={{
              color: listening ? '#ff4488' : '#7b4fa0',
              animation: listening ? 'pulse 1s infinite' : 'none',
            }}
          >
            {listening ? '⏹' : '🎤'}
          </button>
        )}
        <button
          type="button"
          onClick={handleSend}
          disabled={loading || !inputText.trim()}
          className="font-mono text-xs transition-colors"
          style={{ color: inputText.trim() && !loading ? '#00ff9d' : '#336655' }}
        >
          ↵
        </button>
      </div>
    </div>
  );

  // MODAL MODE — center overlay, blocks interaction
  if (mode === 'modal') {
    return (
      <div
        className="fixed inset-0 z-[900] flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)' }}
      >
        <div className="flex flex-col items-center gap-6 w-full" style={{ maxWidth: 520 }}>
          <WizardSprite size={96} talking={loading} />
          {chatOpen && chatPanel}
        </div>
      </div>
    );
  }

  // CORNER MODE — floating sprite, non-blocking
  return (
    <div className={`fixed z-[850] ${CORNER.wrapper} flex flex-col items-end gap-2`}>
      {chatOpen && chatPanel}
      <button
        type="button"
        onClick={handleCornerClick}
        className="transition-all duration-200 hover:scale-105"
        style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
        aria-label="Invocar al mago oculto"
      >
        <WizardSprite size={48} talking={loading} />
      </button>
    </div>
  );
};

export default HiddenWizard;
