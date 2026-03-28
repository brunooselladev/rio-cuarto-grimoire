import { useCallback, useEffect, useRef, useState } from 'react';
import WizardSprite from '@/components/WizardSprite.jsx';
import { getWizardHeaders } from '@/lib/wizard.js';
import { useToast } from '@/hooks/use-toast.js';

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
    }, 20);
    return () => window.clearInterval(id);
  }, [text, onDone]);

  return (
    <span>
      {displayed}
      {!done && <span className="ml-0.5 animate-pulse text-[#ffb347]">_</span>}
    </span>
  );
};

/**
 * NarratorWizardChat — chat del narrador con el mago.
 * - Siempre disponible (no requiere que el mago esté activo para los jugadores).
 * - Usa /api/wizard/narrator-speak (admin-only).
 * - Toggle "Guardar como nota" para persistir el mensaje como nota del mago.
 * - El mago confirma en personaje que recibió la información.
 */
const NarratorWizardChat = () => {
  const { toast } = useToast();
  const [chatOpen, setChatOpen] = useState(false);
  const [history, setHistory] = useState([]); // [{role:'user'|'wizard'|'system', text}]
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [saveAsNote, setSaveAsNote] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  useEffect(() => {
    if (chatOpen && inputRef.current) {
      window.setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [chatOpen]);

  const sendMessage = useCallback(async (text, isSaveAsNote) => {
    const trimmed = text.trim();
    const newHistory = trimmed
      ? [...history, { role: 'user', text: trimmed }]
      : [...history];

    if (trimmed) setHistory(newHistory);
    setInputText('');
    setLoading(true);

    try {
      const apiHistory = newHistory.slice(0, trimmed ? -1 : undefined).map((m) => ({
        role: m.role === 'wizard' ? 'assistant' : 'user',
        content: m.text,
      }));

      const response = await fetch('/api/wizard/narrator-speak', {
        method: 'POST',
        headers: getWizardHeaders({ includeJson: true }),
        body: JSON.stringify({
          message: trimmed || undefined,
          history: apiHistory,
          saveAsNote: isSaveAsNote,
        }),
      });

      if (!response.ok) throw new Error(`Error ${response.status}`);
      const data = await response.json();

      const replyText = data.text || 'Los registros arcanos no responden.';
      const nextHistory = [...newHistory, { role: 'wizard', text: replyText }];

      if (data.noteSaved) {
        nextHistory.push({ role: 'system', text: '✦ Mensaje guardado en la memoria del mago.' });
        toast({ title: 'Nota guardada', description: 'El mensaje quedó registrado en el conocimiento del mago.' });
      }

      setHistory(nextHistory);
    } catch (err) {
      setHistory([...newHistory, { role: 'wizard', text: 'Los registros arcanos no responden.' }]);
    } finally {
      setLoading(false);
    }
  }, [history, toast]);

  const handleOpen = () => {
    setChatOpen(true);
    if (!initialized) {
      setInitialized(true);
      sendMessage('', false);
    }
  };

  const handleSend = () => {
    if (!inputText.trim() || loading) return;
    sendMessage(inputText, saveAsNote);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const chatPanel = (
    <div
      style={{
        width: 300,
        maxHeight: 420,
        background: 'linear-gradient(180deg, rgba(14,6,4,0.97) 0%, rgba(8,4,2,0.99) 100%)',
        border: '1px solid rgba(255,140,0,0.45)',
        boxShadow: '0 0 28px rgba(255,140,0,0.12)',
        borderRadius: 8,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b"
        style={{ borderColor: 'rgba(255,140,0,0.2)' }}
      >
        <div className="flex flex-col">
          <span className="font-mono text-[11px] uppercase tracking-[0.28em]" style={{ color: '#ff8c00' }}>
            Canal del Invocador
          </span>
          <span className="font-mono text-[9px]" style={{ color: 'rgba(255,140,0,0.5)' }}>
            El mago te escucha directamente
          </span>
        </div>
        <button
          type="button"
          onClick={() => setChatOpen(false)}
          className="font-mono text-xs transition-colors"
          style={{ color: 'rgba(255,140,0,0.5)' }}
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
        style={{ minHeight: 120, maxHeight: 260 }}
      >
        {history.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'system' ? (
              <div
                className="font-mono text-[11px] px-3 py-1.5 rounded w-full text-center"
                style={{
                  background: 'rgba(255,140,0,0.1)',
                  color: '#ff8c00',
                  border: '1px solid rgba(255,140,0,0.3)',
                }}
              >
                {msg.text}
              </div>
            ) : (
              <div
                className="font-mono text-xs leading-5 px-3 py-2 rounded max-w-[88%]"
                style={
                  msg.role === 'wizard'
                    ? {
                        background: 'rgba(255,140,0,0.07)',
                        color: '#ffd280',
                        border: '1px solid rgba(255,140,0,0.2)',
                      }
                    : {
                        background: 'rgba(180,80,0,0.18)',
                        color: '#ffcaa0',
                        border: '1px solid rgba(180,80,0,0.3)',
                      }
                }
              >
                {i === history.length - 1 && msg.role === 'wizard' && !loading ? (
                  <TypingText text={msg.text} />
                ) : (
                  msg.text
                )}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div
              className="font-mono text-xs px-3 py-2 rounded"
              style={{
                color: '#ff8c00',
                background: 'rgba(255,140,0,0.07)',
                border: '1px solid rgba(255,140,0,0.2)',
              }}
            >
              <span className="animate-pulse">el mago procesa...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Save-as-note toggle */}
      <div
        className="px-3 pt-2 flex items-center gap-2"
        style={{ borderTop: '1px solid rgba(255,140,0,0.1)' }}
      >
        <button
          type="button"
          onClick={() => setSaveAsNote((v) => !v)}
          className="font-mono text-[10px] px-2 py-1 rounded transition-colors"
          style={
            saveAsNote
              ? { background: 'rgba(255,140,0,0.2)', color: '#ff8c00', border: '1px solid rgba(255,140,0,0.5)' }
              : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,140,0,0.45)', border: '1px solid rgba(255,140,0,0.15)' }
          }
        >
          {saveAsNote ? '📌 Guardar como nota: ON' : '📌 Guardar como nota: OFF'}
        </button>
      </div>

      {/* Input */}
      <div className="px-3 py-2 flex gap-2 items-center" style={{ paddingTop: 6 }}>
        <input
          ref={inputRef}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={saveAsNote ? 'Dictale algo al mago (se guardará)...' : 'Consultá o instrufí al mago...'}
          disabled={loading}
          className="flex-1 bg-transparent font-mono text-xs outline-none border-b pb-1"
          style={{ color: '#ffd280', borderColor: 'rgba(255,140,0,0.3)' }}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={loading || !inputText.trim()}
          className="font-mono text-xs transition-colors"
          style={{ color: inputText.trim() && !loading ? '#ff8c00' : 'rgba(255,140,0,0.3)' }}
        >
          ↵
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed z-[860] bottom-6 left-6 flex flex-col items-start gap-2">
      {chatOpen && chatPanel}
      <button
        type="button"
        onClick={chatOpen ? () => setChatOpen(false) : handleOpen}
        className="transition-all duration-200 hover:scale-105 relative"
        style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
        aria-label="Canal del Invocador — chat con el mago"
        title="Canal del Invocador"
      >
        <WizardSprite size={48} talking={loading} />
        {/* Orange tint overlay to distinguish narrator's wizard from player's */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            boxShadow: '0 0 14px rgba(255,140,0,0.55)',
            pointerEvents: 'none',
          }}
        />
        <div
          className="absolute -top-1 -right-1 font-mono text-[8px] px-1 rounded"
          style={{
            background: 'rgba(255,140,0,0.9)',
            color: '#000',
            lineHeight: '14px',
            pointerEvents: 'none',
          }}
        >
          N
        </div>
      </button>
    </div>
  );
};

export default NarratorWizardChat;
